// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.0;

import {IUniswapV2Router} from "./Interfaces.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@ganache/console.log/console.sol";
import "./FlashLoanSimpleReceiverBase.sol";

contract FlashLoanArbitrage is FlashLoanSimpleReceiverBase {

    // permissions for who can use which function
    mapping(address => bool) private guardians;
    mapping(address => bool) private guardiansOwner;

    constructor (address _addressProvider) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) {
        guardians[msg.sender] = true;
        guardiansOwner[msg.sender] = true;
    }

    modifier onlyGuardianOwner() {
        require(guardiansOwner[msg.sender], "Just the guardiansOwner can execute this function");
        _;
    }

    function setGuardian(address _address, bool _permission) public onlyGuardianOwner {
        guardians[_address] = _permission;
    }

    function setGuardianOwner(address _address, bool _permission) public onlyGuardianOwner {
        guardiansOwner[_address] = _permission;
    }

    modifier onlyGuardians {
        require(guardians[msg.sender], "Guardian error: this address is not allowed");
        _;
    }

    /*
    * @notice It swaps the tokens through all the routers by starting from a specific token with an amount
    * borrowed from the AAVE V3 Pool
    * @param _params - The encoded parameters of the list of routers and tokens
    * @param _asset - The token that you are requesting for the loan
    * @param _amount - The amount of _asset to ask for the loan
    */
    function triangularArbitrageWithFlashLoan(bytes memory _params, address _asset, uint256 _amount) public onlyGuardianOwner {
        address receiverAddress = address(this);

        POOL.flashLoanSimple(
            receiverAddress,
            _asset,
            _amount,
            _params,
            0
        );
    }

    /*
    * @notice This function is called by the AAVE floashloan contract. It execute the trade with the amount loaned
    * @param asset - The token requested for the loan
    * @param amount - The amount of asset to ask for the loan
    * @param premium - The fee to give back
    * @param initiator - not used
    * @param params - The encoded parameters of the list of routers and tokens
    */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    )
    external
    override
    onlyGuardians
    returns (bool)
    {

        // start arbitrage
        // params contains m odds addresses: the first m/2 are routers addresses, the remain are tokens addresses
        (address[] memory addresses) = abi.decode(params, (address[]));

        address[] memory routers = new address[]((addresses.length) / 2);
        address[] memory tokens = new address[]((addresses.length) / 2);

        // save the decoded addresses in the right list
        for (uint i = 0; i < addresses.length; i++) {
            if (i < routers.length) {
                routers[i] = addresses[i];
            }
            else {
                tokens[i-tokens.length] = addresses[i];
            }
        }

        // execute the arbitrage
        triangularDexArb(routers, tokens, amount);

        // end arbitrage
        uint amountOwing = amount + (premium);
        IERC20(asset).approve(address(POOL), amountOwing);

        return true;
    }

    /*
    * @notice From a router, swap tokenA for tokenB by an input amount
    * @param router - The router that will operate the swap
    * @param _tokenIn - The token you are swapping
    * @param _tokenOut - The type of token you want from the swap
    * @param _amount - The amount of _tokenIn you are swapping
    */
    function swap(address router, address _tokenIn, address _tokenOut, uint256 _amount) private {
        IERC20(_tokenIn).approve(router, _amount);
        address[] memory path;
        path = new address[](2);
        path[0] = _tokenIn;
        path[1] = _tokenOut;
        uint deadline = block.timestamp + 300;
        IUniswapV2Router(router).swapExactTokensForTokens(_amount, 1, path, address(this), deadline);
    }

    /*
    * @notice Estimate the trade through n routers for n tokens. The 1th router will estimate the swap A for B, the 2th will estimate the swap B for C,
    * the nth router will estimate the swap X for A. So it starts and end with A.
    * @param _amount - The amount of tokens to swap at the beginning
    * @param routers - The list of routers in which the tokens will be swapped
    * @param tokens - The list of tokens to be swapped
    */
    function estimateTrade(uint256 _amount, address[] calldata routers, address[] calldata tokens) external view returns (uint256) {
        uint amtBack = 0;
        uint tmbAmtBack = 0;

        for (uint i = 0; i < routers.length; i++) {
            if (i == 0) {
                amtBack = getAmountOutMin(routers[i], tokens[i], tokens[i + 1], _amount);
                tmbAmtBack = amtBack;
            }
            else if (i < routers.length - 1) {
                amtBack = getAmountOutMin(routers[i], tokens[i], tokens[i + 1], tmbAmtBack);
                tmbAmtBack = amtBack;
            }
            else {
                amtBack = getAmountOutMin(routers[i], tokens[i], tokens[0], tmbAmtBack);
            }

        }

        return amtBack;
    }

    /*
    * @notice Get how much tokenB you can get by giving n tokenA to some router
    * @param router - The router where the swap will be simulated
    * @param _tokenIn - The token to swap
    * @param _tokenOut - The type of token you want
    * @param _amount - The amount of _tokenIn to swap
    */
    function getAmountOutMin(address router, address _tokenIn, address _tokenOut, uint256 _amount) public view returns (uint256) {
        address[] memory path;
        path = new address[](2);
        path[0] = _tokenIn;
        path[1] = _tokenOut;
        uint256[] memory amountOutMins = IUniswapV2Router(router).getAmountsOut(_amount, path);
        return amountOutMins[path.length - 1];
    }

    /*
    * @notice Swap through n routers for n tokens. The 1th router will swap A for B, the 2th will swap B for C,
    * the nth router will swap X for A. So it starts and end with A.
    * @param amount - The amount of tokens to swap at the beginning
    * @param routers - The list of routers in which the tokens will be swapped
    * @param tokens - The list of tokens to be swapped
    */
    function triangularDexArb(address[] memory routers, address[] memory tokens, uint amount) public onlyGuardians {

        require(routers.length == tokens.length, "triangularDexArb(..) error: routers length differs from tokens length");
        require(routers.length > 2, "triangularDexArb(..) error: at least 3 routers are required");

        uint startBalance = IERC20(tokens[0]).balanceOf(address(this));
        uint tokenInitialBalance = IERC20(tokens[1]).balanceOf(address(this));

        swap(routers[0], tokens[0], tokens[1], amount);

        uint tokenBalance = IERC20(tokens[1]).balanceOf(address(this));
        uint tradeableAmount = tokenBalance - tokenInitialBalance;

        for (uint i = 1; i < routers.length - 1; i++) {

            tokenInitialBalance = IERC20(tokens[i + 1]).balanceOf(address(this));
            swap(routers[i], tokens[i], tokens[i + 1], tradeableAmount);
            tokenBalance = IERC20(tokens[i + 1]).balanceOf(address(this));
            tradeableAmount = tokenBalance - tokenInitialBalance;

        }

        swap(routers[routers.length - 1], tokens[tokens.length - 1], tokens[0], tradeableAmount);
        uint endBalance = IERC20(tokens[0]).balanceOf(address(this));

        require(endBalance > startBalance, "Trade Reverted, No Profit Made");
    }

    function getBalance(address _tokenContractAddress) public onlyGuardians view returns (uint256) {
        uint balance = IERC20(_tokenContractAddress).balanceOf(address(this));
        return balance;
    }

    // transfer the cash from this contract to the owner
    function recoverEth() external onlyGuardianOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    // transfer the token from this contract to the owner
    function recoverTokens(address tokenAddress) external onlyGuardianOwner {
        IERC20 token = IERC20(tokenAddress);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    receive() external payable {}
}
