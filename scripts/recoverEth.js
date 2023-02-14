const utils = require('./Utils')
const FlashLoanArbitrage = artifacts.require('FlashLoanArbitrage')

module.exports = async (callback) => {
    try {
        const networkInfo = await utils.setup(web3)
        const config = require(networkInfo.pathToDb)

        const flArbitrageInstance = await FlashLoanArbitrage.at(config.addresses[0].arbContract)

        await flArbitrageInstance.recoverEth()

    } catch (e) {
        console.log(e)
    }

    callback()
}
