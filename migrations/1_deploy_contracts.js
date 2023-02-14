// utility funtioncs
const utils = require("../scripts/Utils");

// CRUD
const CRUDop = require('../scripts/CRUDoperations')

// ABI of the contract
const FlashLoanArbitrage = artifacts.require("FlashLoanArbitrage");

// db of the respective network
let config

module.exports = async (deployer, network, accounts) => {
    try {

        // find which blockchain is running
        let pathUrlDb = await utils.setup(web3)

        if (pathUrlDb === 'NONE') {
            console.log('Connect to some blockchain network')
        } else {
            config = require(pathUrlDb.pathToDb)

            let updateAddresses = config.addresses[0]

            const gasPrice = await utils.calculateGasPrice(config.tradeInfos[0].gasPrice, 3, web3)

            // deploy the contract and update the details in the db
            await deployer.deploy(FlashLoanArbitrage, config.addresses[0].AAVEPoolAddressProviderV3,
                {from: accounts[0], gasPrice: gasPrice}).then(async (ris) => {
                updateAddresses.arbContract = ris.address
                await CRUDop.putMethod(pathUrlDb.urlToDb + 'addresses', 1, updateAddresses)
            })

            // allow the AAVE Pool V3 to borrow the money to you
            const arbFlashloanContract = await FlashLoanArbitrage.at(config.addresses[0].arbContract)
            await arbFlashloanContract.setGuardian(config.addresses[0].AAVEPoolV3, true)
        }
    }catch (err) {
        console.log('Error on migrating: '+err)
    }

};
