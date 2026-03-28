export class UIHandler {
    constructor(api, treeRenderer) {
        this.api = api;
        this.treeRenderer = treeRenderer;

        // Edit mode tracking
        this._editingMember = null; // null = new, object = editing

        // Elements
        this.modal = document.getElementById('member-modal');
        this.modalTitle = document.querySelector('#member-modal .modal-header h2');
        this.addBtn = document.getElementById('add-member-btn');
        this.closeBtn = document.getElementById('close-modal-btn');
        this.form = document.getElementById('member-form');
        this.saveBtn = document.getElementById('save-member-btn');
        this.fallecidoCheckbox = document.getElementById('fallecido');
        this.deathDateGroup = document.getElementById('death-date-group');
        this.deathDateInput = document.getElementById('fechaFallecimiento');

        this.selectPadre = document.getElementById('idPadre');
        this.selectMadre = document.getElementById('idMadre');
        this.selectPareja = document.getElementById('idPareja');
        this.selectSexo = document.getElementById('sexo');

        this.infoModal = document.getElementById('info-modal');
        this.closeInfoBtn = document.getElementById('close-info-btn');
        this.infoContent = document.getElementById('info-content');

        this.initEventListeners();
    }

    initEventListeners() {
        this.addBtn.addEventListener('click', () => this.openModal());
        this.closeBtn.addEventListener('click', () => this.closeModal());
        
        this.closeInfoBtn.addEventListener('click', () => this.closeInfoModal());

        // Cierra condicional clickeando fuera del contenido
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        this.infoModal.addEventListener('click', (e) => {
            if (e.target === this.infoModal) {
                this.closeInfoModal();
            }
        });

        // Initialize flatpickr on date inputs
        this.dpNacimiento = flatpickr("#fechaNacimiento", {
            locale: "es",
            dateFormat: "Y-m-d",
            allowInput: true
        });
        
        this.dpFallecimiento = flatpickr("#fechaFallecimiento", {
            locale: "es",
            dateFormat: "Y-m-d",
            allowInput: true
        });

        this.fallecidoCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.deathDateGroup.classList.remove('hidden');
                this.deathDateInput.setAttribute('required', 'true');
            } else {
                this.deathDateGroup.classList.add('hidden');
                this.deathDateInput.removeAttribute('required');
                this.dpFallecimiento.clear();
            }
        });

        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmit();
        });

        this.selectSexo.addEventListener('change', () => {
            this.updateParejaOptions(this._editingMember ? this._editingMember.id : null);
        });
    }

    populateSelects(excludeId = null) {
        this.selectPadre.innerHTML = '<option value="">Ninguno</option>';
        this.selectMadre.innerHTML = '<option value="">Ninguna</option>';

        const members = this.api.members;

        members.forEach(m => {
            // No incluir al miembro que se está editando en las opciones
            if (excludeId && m.id === excludeId) return;

            const option = `<option value="${m.id}">${m.nombre} ${m.apellido}</option>`;
            
            if (m.sexo === 'M') {
                 this.selectPadre.insertAdjacentHTML('beforeend', option);
            } else if (m.sexo === 'F') {
                 this.selectMadre.insertAdjacentHTML('beforeend', option);
            } else {
                this.selectPadre.insertAdjacentHTML('beforeend', option);
                this.selectMadre.insertAdjacentHTML('beforeend', option);
            }
        });

        this.updateParejaOptions(excludeId);
    }

    updateParejaOptions(excludeId = null) {
        const previousValue = this.selectPareja.value;
        const currentSexo = this.selectSexo.value;

        this.selectPareja.innerHTML = '<option value="">Ninguna</option>';

        this.api.members.forEach(m => {
            if (excludeId && m.id === excludeId) return;

            // Mostrar solo personas del sexo opuesto (u otros)
            if (currentSexo === 'M' && m.sexo === 'M') return;
            if (currentSexo === 'F' && m.sexo === 'F') return;

            const option = `<option value="${m.id}">${m.nombre} ${m.apellido}</option>`;
            this.selectPareja.insertAdjacentHTML('beforeend', option);
        });

        if (previousValue) {
            this.selectPareja.value = previousValue;
        }
    }

    openModal(member = null) {
        // Limpiar errores visuales previos
        document.getElementById('nombre')?.classList.remove('error');
        document.getElementById('sexo')?.classList.remove('error');
        document.getElementById('error-nombre')?.classList.remove('visible');
        document.getElementById('error-sexo')?.classList.remove('visible');

        this._editingMember = member;
        this.form.reset();
        this.dpNacimiento.clear();
        this.dpFallecimiento.clear();
        this.fallecidoCheckbox.checked = false;
        this.fallecidoCheckbox.dispatchEvent(new Event('change'));

        if (member) {
            // Edit mode — pre-fill form fields
            this.modalTitle.textContent = 'Editar Miembro';
            this.saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Actualizar';
            
            this.selectSexo.value = member.sexo || ''; // assign before populate to filter spouse dropdown
            this.populateSelects(member.id);

            document.getElementById('nombre').value = member.nombre || '';
            document.getElementById('apellido').value = member.apellido || '';

            if (member.fechaNacimiento) {
                this.dpNacimiento.setDate(member.fechaNacimiento);
            }

            if (member.fallecido) {
                this.fallecidoCheckbox.checked = true;
                this.fallecidoCheckbox.dispatchEvent(new Event('change'));
                if (member.fechaFallecimiento) {
                    this.dpFallecimiento.setDate(member.fechaFallecimiento);
                }
            }

            this.selectPadre.value = member.idPadre || '';
            this.selectMadre.value = member.idMadre || '';
            this.selectPareja.value = member.idPareja || '';
        } else {
            // Add mode
            this.modalTitle.textContent = 'Nuevo Miembro';
            this.saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Guardar';
            this.selectSexo.value = '';
            this.populateSelects();
        }

        this.modal.classList.remove('hidden');
    }

    closeModal() {
        this._editingMember = null;
        this.modal.classList.add('hidden');
    }

    async handleFormSubmit() {
        const nombreInput = document.getElementById('nombre');
        const sexoInput = document.getElementById('sexo');
        const errorNombre = document.getElementById('error-nombre');
        const errorSexo = document.getElementById('error-sexo');

        let isValid = true;

        if (!nombreInput.value.trim()) {
            nombreInput.classList.add('error');
            if (errorNombre) errorNombre.classList.add('visible');
            isValid = false;
        } else {
            nombreInput.classList.remove('error');
            if (errorNombre) errorNombre.classList.remove('visible');
        }

        if (!sexoInput.value) {
            sexoInput.classList.add('error');
            if (errorSexo) errorSexo.classList.add('visible');
            isValid = false;
        } else {
            sexoInput.classList.remove('error');
            if (errorSexo) errorSexo.classList.remove('visible');
        }

        if (!isValid) return;

        const formData = new FormData(this.form);
        const memberData = {
            nombre: (formData.get('nombre') || '').trim(),
            apellido: (formData.get('apellido') || '').trim(),
            sexo: formData.get('sexo'),
            fechaNacimiento: formData.get('fechaNacimiento') || null,
            fallecido: this.fallecidoCheckbox.checked,
            fechaFallecimiento: this.fallecidoCheckbox.checked ? formData.get('fechaFallecimiento') : null,
            idPadre: formData.get('idPadre') || null,
            idMadre: formData.get('idMadre') || null,
            idPareja: formData.get('idPareja') || null
        };

        let result;
        if (this._editingMember) {
            // Update existing
            memberData.id = this._editingMember.id;
            result = await this.api.updateMember(memberData);
        } else {
            // Add new
            result = await this.api.addMember(memberData);
        }

        if (result.success) {
            // Sincronización relacional de la pareja (bidireccional)
            let finalMemberId = this._editingMember ? this._editingMember.id : null;
            if (!finalMemberId) {
                finalMemberId = result.id || (result.data && result.data.id) || (result.user && result.user.id);
            }
            if (!finalMemberId) {
                // Caída libre si la API real no devulve el objeto explícito:
                // Buscamos desde atrás (el más reciente) el cual coincida, o al menos el que tenga el mayor ID
                const addedUser = [...this.api.members].reverse().find(m => 
                    m.nombre === memberData.nombre && m.apellido === memberData.apellido
                );
                if (addedUser) finalMemberId = addedUser.id;
            }

            const newParejaId = memberData.idPareja;

            if (finalMemberId) {
                // Convertir explícitamente a String para evitar fallos de ==
                const fid = String(finalMemberId);
                // Si estamos editando y se cambió/quitó la pareja, limpiar al cónyuge anterior
                if (this._editingMember && this._editingMember.idPareja !== newParejaId) {
                    if (this._editingMember.idPareja) {
                        const oldSpouse = this.api.members.find(m => m.id === this._editingMember.idPareja);
                        if (oldSpouse) {
                            await this.api.updateMember({ ...oldSpouse, idPareja: null });
                        }
                    }
                }

                // Asignar al nuevo cónyuge (si es miembro nuevo con pareja o se acaba de cambiar en edición)
                if (newParejaId && (!this._editingMember || String(this._editingMember.idPareja) !== String(newParejaId))) {
                    const newSpouse = this.api.members.find(m => String(m.id) === String(newParejaId));
                    if (newSpouse) {
                        try {
                            await this.api.updateMember({ ...newSpouse, idPareja: fid });
                        } catch(e) {
                            console.error("Error al sincronizar nueva pareja", e);
                        }
                    }
                }
            }

            this.closeModal();
            this.treeRenderer.render(this.api.members);
        }
    }

    closeInfoModal() {
        this.infoModal.classList.add('hidden');
    }

    /**
     * Convierte una fecha de yyyy-mm-dd a dd/mm/yyyy para mostrar al usuario.
     */
    formatDate(dateStr) {
        if (!dateStr) return 'Desconocida';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    calcularDetalles(m) {
        if (!m.fechaNacimiento) return null;
        const born = new Date(m.fechaNacimiento);
        born.setMinutes(born.getMinutes() + born.getTimezoneOffset());
        
        const now = new Date();
        const death = m.fallecido && m.fechaFallecimiento ? new Date(m.fechaFallecimiento) : null;
        if (death) death.setMinutes(death.getMinutes() + death.getTimezoneOffset());

        const calcObj = (start, end) => {
            let a = end.getFullYear() - start.getFullYear();
            const mdiff = end.getMonth() - start.getMonth();
            if (mdiff < 0 || (mdiff === 0 && end.getDate() < start.getDate())) a--;
            return a;
        };

        if (m.fallecido && death) {
            return {
                edadFallecimiento: calcObj(born, death),
                aniosFallecido: calcObj(death, now)
            };
        } else if (!m.fallecido) {
            return {
                edadActual: calcObj(born, now)
            };
        }
        return null;
    }

    openInfoModal(member) {
        this._currentInfoMember = member;
        const detalles = this.calcularDetalles(member);
        const iconSexo = member.sexo === 'M' ? 'Masculino' : (member.sexo === 'F' ? 'Femenino' : 'Otro');
        
        let html = `
            <div class="info-item">
                <strong>Nombre Completo</strong>
                <span>${member.nombre} ${member.apellido}</span>
            </div>
            <div class="info-item">
                <strong>Sexo</strong>
                <span>${iconSexo}</span>
            </div>
            <div class="info-item">
                <strong>Fecha Nacimiento</strong>
                <span>${this.formatDate(member.fechaNacimiento)}</span>
            </div>
        `;

        if (!member.fallecido && detalles && detalles.edadActual !== undefined) {
             html += `
             <div class="info-item">
                 <strong>Edad Actual</strong>
                 <span>${detalles.edadActual} años</span>
             </div>
             `;
        }

        if (member.fallecido) {
            html += `
            <div class="info-item">
                <strong>Fecha de Fallecimiento</strong>
                <span>${this.formatDate(member.fechaFallecimiento)}</span>
            </div>
            `;
            if (detalles && detalles.edadFallecimiento !== undefined) {
                html += `
                <div class="info-item" style="color: var(--danger-color);">
                    <strong>Falleció a la Edad de</strong>
                    <span>${detalles.edadFallecimiento} años</span>
                </div>
                `;
            }
            if (detalles && detalles.aniosFallecido !== undefined) {
                html += `
                <div class="info-item">
                    <strong>Años Transcurridos</strong>
                    <span>${detalles.aniosFallecido} año(s)</span>
                </div>
                `;
            }
        }

        // Relaciones familiares
        const findName = (id) => {
            if (!id) return null;
            const m = this.api.members.find(x => x.id === id);
            return m ? `${m.nombre} ${m.apellido}`.trim() : null;
        };

        const padre = findName(member.idPadre);
        const madre = findName(member.idMadre);
        const pareja = findName(member.idPareja);

        if (padre || madre || pareja) {
            html += `<div class="info-item" style="border-bottom: none; margin-bottom: 0.4rem; padding-bottom: 0.4rem;"><strong style="color: var(--primary-color); text-transform: none; font-size: 0.95rem;">Relaciones</strong></div>`;
        }

        if (padre) {
            html += `
            <div class="info-item">
                <strong>Padre</strong>
                <span>${padre}</span>
            </div>`;
        }
        if (madre) {
            html += `
            <div class="info-item">
                <strong>Madre</strong>
                <span>${madre}</span>
            </div>`;
        }
        if (pareja) {
            html += `
            <div class="info-item">
                <strong>Pareja / Cónyuge</strong>
                <span>${pareja}</span>
            </div>`;
        }

        // Botón de editar
        html += `
        <div class="form-actions" style="margin-top: 1.25rem;">
            <button type="button" id="edit-member-btn" class="edit-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Editar
            </button>
        </div>`;

        this.infoContent.innerHTML = html;

        // Bind edit button
        document.getElementById('edit-member-btn').addEventListener('click', () => {
            this.closeInfoModal();
            this.openModal(member);
        });

        this.infoModal.classList.remove('hidden');
    }
}
