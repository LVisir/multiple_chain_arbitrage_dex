const fetch = require('node-fetch')

const getMethod = async (path, id) => {
    let ris
    try {
        await fetch(path + `/${id}`, {
            method: 'GET'
        }).then(async (response) => {
            ris = await response.json()
        })
    } catch (err) {
        console.log('error in get method: ' + err)
    }
    return ris
}

const postMethod = async (path, object) => {
    let ris
    try {
        await fetch(path, {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify(object)
        }).then(async (response) => {
            ris = await response.json()
        })
    } catch (err) {
        console.log('error in post method: ' + err)
    }

    return ris
}

const putMethod = async (path, id, object) => {
    try {
        await fetch(path + `/${id}`, {
            method: 'PUT',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify(object)
        })
    } catch (err) {
        console.log('error in put method: ' + err)
    }
}

const deleteMethod = async(path, id) => {
    try {
        await fetch(path + `/${id}`, {
            method: 'DELETE'
        })
    } catch (err) {
        console.log('error in put method: ' + err)
        return false
    }
    return true
}

const getAllMethod = async(path) => {
    let ris = []
    try{
        await fetch(path, {
            method: 'GET'
        }).then(async (response) => {
            ris = await response.json()
        })
    } catch (err) {
        console.log('error in getAll method: '+err)
        return ris
    }
    return ris
}

module.exports = {
    getMethod,
    putMethod,
    postMethod,
    deleteMethod,
    getAllMethod
}
