export class FamiliaAPI {
    constructor(gasUrl = '') {
        this.gasUrl = gasUrl;
        this.members = []; // Local cache
    }

    setLoading(isLoading) {
        const loader = document.getElementById('loader');
        if (loader) {
            if (isLoading) {
                loader.classList.remove('hidden');
            } else {
                loader.classList.add('hidden');
            }
        }
    }

    /**
     * Normaliza un registro crudo de Google Sheets para
     * asegurar tipos consistentes en la app.
     */
    _normalize(raw) {
        return {
            id:                  String(raw.id),
            nombre:              (raw.nombre || '').trim(),
            apellido:            (raw.apellido || '').trim(),
            sexo:                raw.sexo || null,
            fechaNacimiento:     raw.fechaNacimiento || null,
            fallecido:           raw.fallecido === true || raw.fallecido === 'TRUE',
            fechaFallecimiento:  raw.fechaFallecimiento || null,
            idPadre:             raw.idPadre !== '' && raw.idPadre != null ? String(raw.idPadre) : null,
            idMadre:             raw.idMadre !== '' && raw.idMadre != null ? String(raw.idMadre) : null,
            idPareja:            raw.idPareja !== '' && raw.idPareja != null ? String(raw.idPareja) : null
        };
    }

    async getMembers() {
        this.setLoading(true);
        try {
            if (!this.gasUrl) {
                console.log("No se definió URL de GAS. Usando datos Mock.");
                await new Promise(resolve => setTimeout(resolve, 600));
                this.members = this.getMockData();
                return this.members;
            }

            const response = await fetch(this.gasUrl);
            if (!response.ok) throw new Error("Error en red");
            const data = await response.json();

            // Normalizar y filtrar filas vacías (sin nombre)
            this.members = data
                .map(row => this._normalize(row))
                .filter(m => m.nombre.length > 0);

            return this.members;
        } catch (error) {
            console.error("Error obteniendo datos:", error);
            alert("Error al obtener los datos del servidor.");
            return [];
        } finally {
            this.setLoading(false);
        }
    }

    async addMember(memberParams) {
        this.setLoading(true);
        try {
            if (!this.gasUrl) {
                // Mock local
                if (!memberParams.id) {
                    memberParams.id = String(this.members.length + 1);
                }
                console.log("Guardando en Mock API:", memberParams);
                await new Promise(resolve => setTimeout(resolve, 800));
                this.members.push(memberParams);
                
                if (memberParams.idPareja) {
                    const pareja = this.members.find(m => m.id === memberParams.idPareja);
                    if (pareja) pareja.idPareja = memberParams.id;
                }
                
                return { success: true, user: memberParams };
            }

            // Google Apps Script — POST con text/plain para evitar problemas CORS
            const response = await fetch(this.gasUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'addMember', data: memberParams }),
                headers: {
                    'Content-Type': 'text/plain'
                }
            });
            const result = await response.json();
            
            if (result.success) {
                // Re-fetch para tener los IDs reales generados por la hoja
                await this.getMembers();
            }
            return result;
        } catch (error) {
            console.error("Error guardando miembro:", error);
            alert("Hubo un problema al guardar. Revisa consola.");
            return { success: false, error };
        } finally {
            this.setLoading(false);
        }
    }

    async updateMember(memberParams) {
        this.setLoading(true);
        try {
            if (!this.gasUrl) {
                // Mock local — actualizar en el array
                console.log("Editando en Mock API:", memberParams);
                await new Promise(resolve => setTimeout(resolve, 500));
                const idx = this.members.findIndex(m => m.id === memberParams.id);
                if (idx !== -1) this.members[idx] = { ...this.members[idx], ...memberParams };
                return { success: true };
            }

            const response = await fetch(this.gasUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'updateMember', data: memberParams }),
                headers: { 'Content-Type': 'text/plain' }
            });
            const result = await response.json();

            if (result.success) {
                await this.getMembers();
            }
            return result;
        } catch (error) {
            console.error("Error actualizando miembro:", error);
            alert("Hubo un problema al actualizar. Revisa consola.");
            return { success: false, error };
        } finally {
            this.setLoading(false);
        }
    }

    getMockData() {
        // Datos mock según el esquema del README
        return [
            { id: "1", nombre: "Juan", apellido: "Pérez", sexo: "M", fechaNacimiento: "1950-01-01", fallecido: true, fechaFallecimiento: "2010-05-01", idPadre: null, idMadre: null, idPareja: "2" },
            { id: "2", nombre: "María", apellido: "Gómez", sexo: "F", fechaNacimiento: "1952-03-15", fallecido: false, fechaFallecimiento: null, idPadre: null, idMadre: null, idPareja: "1" },
            { id: "3", nombre: "Carlos", apellido: "Pérez Gómez", sexo: "M", fechaNacimiento: "1975-06-20", fallecido: false, fechaFallecimiento: null, idPadre: "1", idMadre: "2", idPareja: "4" },
            { id: "4", nombre: "Ana", apellido: "López", sexo: "F", fechaNacimiento: "1978-11-10", fallecido: false, fechaFallecimiento: null, idPadre: null, idMadre: null, idPareja: "3" },
            { id: "5", nombre: "Luis", apellido: "Pérez López", sexo: "M", fechaNacimiento: "2005-08-30", fallecido: false, fechaFallecimiento: null, idPadre: "3", idMadre: "4", idPareja: null },
            { id: "6", nombre: "Laura", apellido: "Pérez Gómez", sexo: "F", fechaNacimiento: "1980-02-14", fallecido: false, fechaFallecimiento: null, idPadre: "1", idMadre: "2", idPareja: null },
            // Abuelos paternos para testear jerarquias hacia arriba
            { id: "7", nombre: "Pedro", apellido: "Pérez Padre", sexo: "M", fechaNacimiento: "1925-01-01", fallecido: true, fechaFallecimiento: "1990-01-01", idPadre: null, idMadre: null, idPareja: "8" },
            { id: "8", nombre: "Antonia", apellido: "Pérez Madre", sexo: "F", fechaNacimiento: "1928-01-01", fallecido: true, fechaFallecimiento: "1995-01-01", idPadre: null, idMadre: null, idPareja: "7" }
        ];
        // En mock se actualiza Juan:
        // Juan debería tener idPadre: 7, idMadre: 8. Pero en Javascript para simplificar, se la añado ahora al mock:
    }
}
