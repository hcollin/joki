import MapContainer from './MapContainer';

describe('MapContainer', () => {

    it('Adding and removing items', () => {
        const cont = MapContainer({
            key: "test",
        });

        cont.set({
            name: "John Morrison",
            age: 27,
            gender: "M"
        });
        expect(cont.stats().size).toBe(1);
        
        cont.set({
            name: "Bob Dylan",
            age: 72,
            gender: "M"
        });
        expect(cont.stats().size).toBe(2);

        const l = cont.get();
        expect(l.length).toBe(2);
        expect(l[0].name).toBe("John Morrison");

        const bob = cont.get(l[1]._jokiContainerId);
        expect(bob.age).toBe(72);

        cont.del(bob);
        expect(cont.stats().size).toBe(1);

        cont.set([
            {
                name: "John Lennon",
                age: 40,
                gender: "M"
            },
            {
                name: "Janis Joplin",
                age: 27,
                gender: "F"
            }
        ]);
    
        expect(cont.stats().size).toBe(3);


    });
})