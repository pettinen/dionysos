export class User {
    constructor(data) {
        const properties = ['id', 'name']
        properties.forEach(property => {
            this[property] = data[property]
        })
    }
}
