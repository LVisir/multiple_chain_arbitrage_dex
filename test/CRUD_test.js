const crudOp = require('../scripts/CRUDoperations')
const assert = require("assert");

contract('No Contract', () => {

    const path = 'http://localhost:8001/tests'

    it('should insert an element in the db', async () => {
        let expected = 'test'
        let actual = await crudOp.postMethod(path, {name: 'test'})

        assert.equal(expected, actual.name, 'The method post doesn\'t work')
    })

    it('should get an element in the db', async () => {
        let expected = 'test'

        let actual = await crudOp.getMethod(path, 1)

        assert.equal(expected, actual.name, 'The method get doesn\'t work')
    })

    it('should get all the element in the db', async () => {
        let expected = 'test'

        let actual = await crudOp.getAllMethod(path)

        assert.equal(expected, actual[0].name, "The method getAll doesn\'t work")
    })

    it('should update an element in the db', async () => {
        let expected = 'newTest'

        await crudOp.putMethod(path, 1, {name: 'newTest'})
        let actual = await crudOp.getMethod(path, 1)

        assert.equal(expected, actual.name, 'The put method doesn\'t work')
    })

    it('should delete an element in the db', async () => {
        assert(await crudOp.deleteMethod(path, 1), 'The method delete doesn\'t work')
    })

})
