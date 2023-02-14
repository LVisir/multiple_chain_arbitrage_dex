const utils = require('./Utils')

module.exports = async (callback) => {
    try {
        const networkInfos = await utils.setup(web3)
        if(networkInfos === 'NONE') {
            throw new Error('The current blockchain network is not supported')
        }

        const config = require(networkInfos.pathToDb)
        // who will receive the currency
        const recipient = config.addresses[0].ownerMainnetAddress

        const accounts = await web3.eth.getAccounts()

        await web3.eth.sendTransaction({from: accounts[0], to: recipient, value: web3.utils.toWei("10", "ether")})

    }
    catch (e) {
        console.log(e)
    }

    callback()
}
