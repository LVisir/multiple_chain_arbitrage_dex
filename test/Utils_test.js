const utils = require('../scripts/Utils')
const crudOp = require('../scripts/CRUDoperations')
const assert = require("assert");

let config

contract('Utils script tests', () => {

    it.skip('should save the price', async () => {

        let newtorkInfo = await utils.setup(web3)
        config = require(newtorkInfo.pathToDb)

        let tokenList = [config.asset[0]]

        let result = await crudOp.getAllMethod(newtorkInfo.urlToDb+'tokenPrices')

        await utils.savePrezziToken(tokenList, web3)

        let actual = result[result.length-1]

        let expected = await crudOp.getAllMethod(newtorkInfo.urlToDb+'tokenPrices')

        if(actual === undefined) {
            assert.equal(1,expected.length, 'The price was not added')
            await crudOp.deleteMethod(newtorkInfo.urlToDb+'tokenPrices', expected[expected.length-1].id)
        }
        else {
            assert.notEqual(actual.address, expected[expected.length-1].address, 'The new price wasn\'t added')
            if(actual.address !== expected[expected.length-1].address) {
                await crudOp.deleteMethod(newtorkInfo.urlToDb+'tokenPrices', expected[expected.length-1].id)
            }
        }

    })

})
