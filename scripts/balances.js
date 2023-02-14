const WETH9 = artifacts.require('WETH9')
const FlashLoanArbitrage = artifacts.require('FlashLoanArbitrage')
const utils = require('./Utils')

const getTokenBalances = async () => {

    try {

        let networkInfos = await utils.setup(web3)

        if(networkInfos === 'NONE') {
            throw new Error('The current blockchain network is not supported')
        }

        let accounts = await web3.eth.getAccounts()
        let config = require(networkInfos.pathToDb)
        let assets = config.asset
        let token
        const arb = await FlashLoanArbitrage.at(config.addresses[0].arbContract)

        for (let i = 0; i < assets.length; i++) {
            token = await WETH9.at(assets[i].address)
            let ownerBalance = await token.balanceOf(accounts[0])
            console.log(`${assets[i].symbol} Owner Balance: `, ownerBalance.toString());
            const arbBalance = await arb.getBalance(assets[i].address);
            console.log(`${assets[i].symbol} Arb Balance: `, arbBalance.toString());
        }

        let arbBalance = await web3.eth.getBalance(config.addresses[0].arbContract)
        console.log('contract balance -> ' + arbBalance.toString())

        let ownerBalance = await web3.eth.getBalance(accounts[0])
        console.log('owner balance -> '+ ownerBalance.toString())
    }catch (e) {
        console.log(e)
    }

}


module.exports = async (callback) => {
    await getTokenBalances()
    callback()
}
