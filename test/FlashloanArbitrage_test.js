const utils = require('../scripts/Utils')
const BN = require("bn.js");
const FlashloanArbitrage = artifacts.require('FlashloanArbitrage')
const IUniswapV2Router = artifacts.require('IUniswapV2Router')
const IPool = artifacts.require('IPool')

let config

contract('FlashloanArbitrage', (accounts) => {

    it.skip('should trasfer tokens to the contract', async () => {

        // load network and db info
        await setup()

        let router = config.routers[0].address

        // load contracts
        const uniswapRouterInstance = await IUniswapV2Router.at(router)
        const flArbitrageInstance = await FlashloanArbitrage.deployed()

        // amount of token to get from Weth deposit
        let amtTokenOut = 1000000

        // get the weth address
        let wethAddress = 'NONE'

        wethAddress = await uniswapRouterInstance.WETH()

        // search from the db the address of a random token different from the wethAddress
        let tokenOut = 'NONE'
        let assets = config.asset
        for (let i = 0; i < assets.length; i++) {
            if (tokenOut === 'NONE' && tokenOut !== wethAddress) {
                tokenOut = assets[i].address
            }
        }

        // if there isn't any WETH and tokenOut address the test should fail
        assert.notEqual('NONE', wethAddress, 'The WETH address is not present in the db')
        assert.notEqual('NONE', tokenOut, 'The tokenOut address is not present in the db')

        // get the initial balance of the token in the FlashloanArbitrage contract
        let tokenInitialBalance = await flArbitrageInstance.getBalance(wethAddress)

        // get the amount that the contract should take from the swap of the WETH
        let wethAmt = await uniswapRouterInstance.getAmountsIn(amtTokenOut, [wethAddress, tokenOut])

        // swap WETH for the TOKEN
        await uniswapRouterInstance.swapETHForExactTokens(amtTokenOut, [wethAddress, tokenOut], flArbitrageInstance.address, Date.now() + 300, {
            from: accounts[0],
            value: wethAmt[0].toString()
        })

        // get the new balance after the swap
        let actual = await flArbitrageInstance.getBalance(tokenOut)

        assert.notEqual(tokenInitialBalance.toString(), actual.toString(), 'The initial and the updated balance of WETH are equal')
        assert.equal(tokenInitialBalance.add(new BN(amtTokenOut.toString())), actual.toString(), 'The swap didn\'t go through')

    })

    /**
     * to execute this test you must comment the revert in the 'triangularDexArb(...)'
     * otherwise it will throw the revert because it is impossible that you find an
     * arbitrage opportunity at the first try;
      */
    it.skip('should return the correct amount after the swaps', async () => {

        // load network and db info
        await setup()

        // retrieve routers and token address from db
        const routers = config.routers
        const tokens = config.asset

        // load contracts
        const flArbitrageInstance = await FlashloanArbitrage.deployed()
        const uniswapRouterInstance = await IUniswapV2Router.at(routers[0].address)

        const wethAddress = await uniswapRouterInstance.WETH()

        // charge some token to the contract
        await uniswapRouterInstance.swapETHForExactTokens(1000000, [wethAddress, tokens[1].address], flArbitrageInstance.address, Date.now() + 300,
            {value: web3.utils.toWei('1', 'ether')})

        const expected = await flArbitrageInstance.estimateTrade(1000000, [routers[0].address, routers[1].address, routers[2].address],
            [tokens[1].address, tokens[0].address, tokens[2].address])

        await flArbitrageInstance.triangularDexArb([routers[0].address, routers[1].address, routers[2].address],
            [tokens[1].address, tokens[0].address, tokens[2].address], 1000000)

        const actual = await flArbitrageInstance.getBalance(tokens[1].address)

        assert.equal(expected.toString(), actual.toString(), 'The swap doesn\'t work')

    })

    /**
     * to execute this test you must comment the revert in the 'triangularDexArb(...)'
     * otherwise it will throw the revert because it is impossible that you find an
     * arbitrage opportunity at the first try;
     * in the db of the blockchain network that you are testing u must have in the position one the USDC address;
     * it can happen that a trade can return zero and an arithmetic overflow is thrown so to avoid this, try different combination
     * of tokens (always start with USDC) by modifying the 'indexTokens' variable;
     */
    it.skip('should borrow the money and trade', async () => {

        // load network and db info
        await setup()

        // retrieve routers and token address from db
        const routers = config.routers
        const tokens = config.asset

        const indexTokens = [0,2]

        // load contracts
        const flArbitrageInstance = await FlashloanArbitrage.deployed()
        await flArbitrageInstance.setGuardian(config.addresses[0].AAVEPoolV3, true)
        const uniswapRouterInstance = await IUniswapV2Router.at(routers[0].address)
        const wethAddress = await uniswapRouterInstance.WETH()
        const poolContract = await IPool.at(config.addresses[0].AAVEPoolV3)

        // flashloan fees
        const premiun = await poolContract.FLASHLOAN_PREMIUM_TOTAL()
        const amtToLoan = 1000000
        const fee = amtToLoan*(10000 + parseInt(premiun.toString()))
        const loanAndFee = fee / 10000

        // charge some token to the contract
        await uniswapRouterInstance.swapETHForExactTokens(2000000, [wethAddress, tokens[1].address], flArbitrageInstance.address, Date.now() + 300,
            {value: web3.utils.toWei('2', 'ether')})

        const initialBalance = await flArbitrageInstance.getBalance(tokens[1].address)

        const tradeEstimated = await flArbitrageInstance.estimateTrade(
            amtToLoan,
            [routers[0].address,
            routers[1].address,
            routers[2].address],
            [tokens[1].address,
            tokens[indexTokens[0]].address,
            tokens[indexTokens[1]].address]
        )

        const calldataParamsBytes = web3.eth.abi.encodeParameter('address[]', [
            routers[0].address,
            routers[1].address,
            routers[2].address,
            tokens[1].address,
            tokens[indexTokens[0]].address,
            tokens[indexTokens[1]].address
        ]);

        await flArbitrageInstance.triangularArbitrageWithFlashLoan(calldataParamsBytes, tokens[1].address, amtToLoan)

        const expected = await flArbitrageInstance.getBalance(tokens[1].address)

        const actual = parseInt(initialBalance.toString()) + parseInt(tradeEstimated.toString()) - loanAndFee

        assert.equal(expected.toString(), actual.toString(), 'The balance after the flahloan arbitrage is wrong')

    })

    it.skip('should transfer the tokens from the contract to the owner', async () => {
        // load network and db info
        await setup()

        // load contracts
        const flArbitrageInstance = await FlashloanArbitrage.at(config.addresses[0].arbContract)
        const uniswapRouterInstance = await IUniswapV2Router.at(config.routers[0].address)
        const wethAddress = await uniswapRouterInstance.WETH()

        // charge some token to the contract
        await uniswapRouterInstance.swapETHForExactTokens(2000000, [wethAddress, config.token[1].address], flArbitrageInstance.address, Date.now() + 300,
            {value: web3.utils.toWei('2', 'ether')})

        let tokenBalance = await flArbitrageInstance.getBalance(config.token[1].address)

        assert.equal('2000000', tokenBalance.toString(), 'The contract don\'t have any tokens')

        await flArbitrageInstance.recoverTokens(config.token[1].address)

        tokenBalance = await flArbitrageInstance.getBalance(config.token[1].address)

        assert.equal('0', tokenBalance.toString(), 'The tokens aren\'t transferred')

    })

    const setup = async () => {
        let newtorkInfo = await utils.setup(web3)
        config = require(newtorkInfo.pathToDb)
    }

})
