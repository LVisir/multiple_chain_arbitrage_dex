const FlashLoanArbitrage = artifacts.require('FlashLoanArbitrage')
const utils = require('./Utils')

module.exports = async (callback) => {

    try{
        const networkInfos = await utils.setup(web3)
        if(networkInfos === 'NONE') {
            throw new Error('The current blockchain network is not supported')
        }

        const config = require(networkInfos.pathToDb)
        const flArbitrageInstance = await FlashLoanArbitrage.at(config.addresses[0].arbContract)

        await utils.sendTokensFromContractToOwner(config.asset, flArbitrageInstance)

    }catch (e) {
        console.log(e)
    }

    callback()
}
