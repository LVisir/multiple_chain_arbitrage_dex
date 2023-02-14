pragma solidity ^0.8.0;

import {IUniswapV2Router} from "./Interfaces.sol";

/*
* @notice The scope of this contract is just to execute the test. Remember to use a forked network. Read Readme
*/
contract UniswapV2Router {

    // get how much tokenB you can get by giving n tokenA to some router
    function getAmountOutMin(address router, address _tokenIn, address _tokenOut, uint256 _amount) public view returns (uint256) {
        address[] memory path;
        path = new address[](2);
        path[0] = _tokenIn;
        path[1] = _tokenOut;
        uint256[] memory amountOutMins = IUniswapV2Router(router).getAmountsOut(_amount, path);
        return amountOutMins[path.length - 1];
    }

    // get how much tokenA you can get by giving n tokenB to some router
    function getAmountInMin(address router, address _tokenIn, address _tokenOut, uint256 _amount) public view returns (uint256) {
        address[] memory path;
        path = new address[](2);
        path[0] = _tokenIn;
        path[1] = _tokenOut;
        uint256[] memory amountOutMins = IUniswapV2Router(router).getAmountsIn(_amount, path);
        return amountOutMins[0];
    }

    // _amount is the amount you want of the token requested
    function swapEthForTokens(uint _amount, address _wethTokenIn, address _tokenOut, address _router, address _to) public payable {
        address[] memory path;
        path = new address[](2);
        path[0] = _wethTokenIn;
        path[1] = _tokenOut;
        uint deadline = block.timestamp + 300;
        IUniswapV2Router(_router).swapETHForExactTokens(_amount, path, _to, deadline);
    }

    function getWethAddress(address _router) public view returns(address) {
        address wethAddress = IUniswapV2Router(_router).WETH();

        return wethAddress;
    }

}
