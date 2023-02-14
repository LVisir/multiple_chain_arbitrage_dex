const utils = require('../scripts/Utils')

module.exports = async (callback) => {
    try {
        // find the right blockchain
        const networkInfos = await utils.setup(web3)
        if(networkInfos === 'NONE') {
            throw new Error('The current blockchain network is not supported')
        }
        const config = require(networkInfos.pathToDb)

        // save the price of the tokens
        await utils.savePrezziToken(config.asset, web3, networkInfos.urlToDb)
    } catch (e) {
        console.log(e)
    }

    callback()

}
