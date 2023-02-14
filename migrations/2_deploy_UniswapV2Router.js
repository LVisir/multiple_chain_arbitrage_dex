// ABI of the contract
const UniswapV2Router = artifacts.require('UniswapV2Router')

// this deploy is only needed for the tests
module.exports = async (deployer) => {
    try {

        await deployer.deploy(UniswapV2Router)

    } catch (err) {
        console.log('Error on migrating: ' + err)
    }

};
