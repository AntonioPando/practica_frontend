import { Component, EventEmitter, OnInit, Output, Input, OnChanges, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { UserService } from "src/app/core/services/user.service";

@Component({
    selector: 'app-user-popup',
    templateUrl: './user-popup.component.html',
    styleUrls: ['./user-popup.component.css'],
    standalone: true,
    imports: [ CommonModule, FormsModule ]
})
export class UserPopupComponent implements OnInit {

    // Eventos para comunicar al componente padre que el popup se ha cerrado, indicando si se guardaron cambios o no
    @Output() cerrarPopUpOk = new EventEmitter<void>();
    @Output() cerrarPopUpCancel = new EventEmitter<void>();

    // estado del popup: 'CREAR', 'ACTUALIZAR' o 'CLOSED'
    @Input() estadoPopup: string = "CREAR";
    // ID del usuario seleccionado para actualización (null si se va a crear un nuevo usuario)
    @Input() selectedUserId: number | null = null;

    // combo data
    generos: any[] = [];
    puestos: any[] = [];

    // campos del formulario
    nickUsuario = '';
    password = '';
    nombre = '';
    primerApellido = '';
    segundoApellido = '';
    fechaNacimiento: string = '';
    fechaHoraCreacion: string = '';
    horaDesayuno: string = '';
    generoId: any = null;
    puestoDeTrabajoId: any = null;

    // direcciones
    direcciones: any[] = [];
    addressForm: any = { nombre_calle: '', numero_calle: '', direccion_principal: false };
    selectedAddressIndex: number | null = null;
    mainAddressIndex: number | null = null;

    constructor(private userService: UserService) {}
    async ngOnInit() {
        this.fechaHoraCreacion = new Date().toISOString();

        // Cargar opciones de generos y puestos para los selects
        try {
            const gens: any = await this.userService.obtenerGeneros();
            this.generos = Array.isArray(gens) ? gens : [];
        } catch (e) {
            this.generos = [];
            console.error('Error loading generos', e);
        }

        try {
            const ps: any = await this.userService.obtenerPuestos();
            this.puestos = Array.isArray(ps) ? ps : [];
        } catch (e) {
            this.puestos = [];
            console.error('Error loading puestos', e);
        }

        // Cargar todas las direcciones para el modo CREAR
        if (this.estadoPopup === 'CREAR') {
            try {
                const dirsResp: any = await this.userService.obtenerTodasDirecciones();
                this.direcciones = Array.isArray(dirsResp) ? dirsResp.map((d: any) => this.normalizeDireccionFromApi(d)) : [];
            } catch (e) {
                console.error('Error loading direcciones for create', e);
                this.direcciones = [];
            }
        }
    }

    // Detectar cambios en los @Input para cargar el usuario cuando se abre el popup en modo ACTUALIZAR
    async ngOnChanges(changes: SimpleChanges) {
        if (changes['estadoPopup'] || changes['selectedUserId']) {
            if (this.estadoPopup === 'ACTUALIZAR' && this.selectedUserId != null) {
                await this.loadUserForUpdate(this.selectedUserId);
            }
        }
    }

    // Cargar datos del usuario seleccionado para actualización, y sus direcciones asociadas
    private async loadUserForUpdate(id: number) {
        try {
            const user: any = await this.userService.obtenerUsuario(id);
            if (user) {
                this.nickUsuario = user.nickUsuario ?? '';
                this.password = user.contrasena ?? user.password ?? '';
                this.nombre = user.nombre ?? '';
                this.primerApellido = user.primerApellido ?? '';
                this.segundoApellido = user.segundoApellido ?? '';
                this.fechaNacimiento = user.fechaNacimiento ? (user.fechaNacimiento.split('T')[0]) : '';
                this.fechaHoraCreacion = user.fechaHoraCreacion ?? this.fechaHoraCreacion;
                this.horaDesayuno = user.horaDesayuno ? this.formatTimeForInput(user.horaDesayuno) : '';
                this.generoId = user.genero ? user.genero.id : (user.generoId ?? null);
                this.puestoDeTrabajoId = user.puestoDeTrabajo ? user.puestoDeTrabajo.id : (user.puestoDeTrabajoId ?? null);
            }
        } catch (e) {
            console.error('Error loading usuario for update', e);
        }

        // cargar todas las direcciones para el modo ACTUALIZAR
        try {
            const dirsResp: any = await this.userService.obtenerTodasDirecciones();
            this.direcciones = Array.isArray(dirsResp) ? dirsResp.map((d: any) => this.normalizeDireccionFromApi(d)) : [];
            const idx = this.direcciones.findIndex(d => !!d.direccion_principal && d.usuarioId === id);
            this.mainAddressIndex = idx >= 0 ? idx : null;
        } catch (e) {
            console.error('Error loading todas las direcciones', e);
            this.direcciones = [];
        }
    }

    private formatTimeForInput(t: string) {
        if (!t) return '';
        const parts = t.split(':');
        if (parts.length >= 2) return parts[0].padStart(2,'0') + ':' + parts[1].padStart(2,'0');
        return t;
    }

    // ---- Eventos y acciones ----------------------------------------
    async onSave() {
        console.log('Save user');
        const usuarioPost: any = {
            nickUsuario: this.nickUsuario,
            nombre: this.nombre,
            primerApellido: this.primerApellido,
            segundoApellido: this.segundoApellido,
            fechaNacimiento: this.fechaNacimiento ? (this.fechaNacimiento + 'T00:00:00') : null,
            fechaHoraCreacion: this.fechaHoraCreacion,
            horaDesayuno: this.horaDesayuno ? (this.horaDesayuno + ':00') : null,
            esAdmin: false,
            generoId: this.generoId,
            puestoDeTrabajoId: this.puestoDeTrabajoId
        };

        // Solo añadimos la contraseña al payload si el usuario ha escrito una nueva
        if (this.password && this.password.trim() !== '') {
            usuarioPost.password = this.password;
            usuarioPost.contrasena = this.password;
        }

        if (this.estadoPopup === 'CREAR') {
            const createdResp: any = await this.userService.crearUsuario(usuarioPost);
            if (Array.isArray(createdResp)) {
                const err = createdResp[0];
                alert('Error creando usuario: ' + this.formatError(err));
                return;
            }
            const created = createdResp;
            const userId = created?.id || created?.body?.id || null;

            for (let i = 0; i < this.direcciones.length; i++) {
                const a = this.direcciones[i];
                if (!a) continue;

                // En modo crear, solo procesar las direcciones recién añadidas en esta sesión
                if (!a._needsAssign) continue;

                try {
                    if (a.id) {
                        const payload = this.buildDireccionPayload({ ...a, usuarioId: userId });
                        await this.userService.actualizarDireccion(a.id, payload);
                    } else {
                        const payload = this.buildDireccionPayload({ ...a, usuarioId: userId });
                        await this.userService.crearDireccion(payload);
                    }
                } catch (e) {
                    console.error('Error assigning address after create', e);
                }
            }
            this.cerrarPopUpOk.emit();
            return;
        }

        // ACTUALIZAR
        if (this.estadoPopup === 'ACTUALIZAR' && this.selectedUserId != null) {
            try {
                const resp: any = await this.userService.actualizarUsuario(this.selectedUserId, usuarioPost);
                if (Array.isArray(resp)) {
                    alert('Error actualizando usuario: ' + this.formatError(resp[0]));
                    return;
                }
            } catch (e) {
                alert('Error actualizando usuario: ' + this.formatError(e));
                return;
            }

            // Asegurar que solo una tenga direccion_principal = true
            let mainFound = false;
            for (let i = 0; i < this.direcciones.length; i++) {
                const a = this.direcciones[i];
                if (!a) continue;
                // En modo actualizar, solo enviar las direcciones que pertenecen a este usuario
                if (a.usuarioId !== this.selectedUserId && !a._needsAssign) continue;

                if (a.direccion_principal && !mainFound) mainFound = true;
                if (!a.direccion_principal && !mainFound && i === this.mainAddressIndex) {
                    a.direccion_principal = true;
                    mainFound = true;
                }
            }

            for (let i = 0; i < this.direcciones.length; i++) {
                const a = this.direcciones[i];
                if (!a) continue;

                if (a.usuarioId !== this.selectedUserId && !a._needsAssign) continue;

                const payload = this.buildDireccionPayload({ ...a, usuarioId: this.selectedUserId });
                try {
                    if (a.id) {
                        await this.userService.actualizarDireccion(a.id, payload);
                    } else {
                        const createdAddr: any = await this.userService.crearDireccion(payload);
                        // update local entry with returned id if available
                        const norm = this.normalizeDireccionFromApi(createdAddr);
                        this.direcciones[i] = { ...a, ...norm };
                    }
                } catch (e) {
                    console.error('Error persisting address on update', e);
                }
            }

            if (this.mainAddressIndex != null) {
                await this.toggleMainAddress(this.mainAddressIndex);
            }

            this.cerrarPopUpOk.emit();
            return;
        }
    }

    // Cerrar sin guardar
    onCancel() {
        this.cerrarPopUpCancel.emit();
    }

    // Direcciones CRUD
    // Agregar nueva dirección: se añade a la lista con un ID temporal negativo, se persiste en backend, si el backend retorna un ID real se actualiza la entrada de la lista, si no se muestra error
    async addAddress() {
        const payload = this.buildDireccionPayload({ ...this.addressForm, usuarioId: this.selectedUserId });
        try {
            const resp: any = await this.userService.crearDireccion(payload);
            if (Array.isArray(resp)) throw resp[0];
            const created = this.normalizeDireccionFromApi(resp);
            if (!created.usuarioId) (created as any)._needsAssign = true;
            if (created.direccion_principal) {
                this.direcciones.forEach(a => a.direccion_principal = false);
                this.mainAddressIndex = this.direcciones.length;
            }
            this.direcciones.push(created);
            this.addressForm = { nombre_calle: '', numero_calle: '', direccion_principal: false };
        } catch (e) {
            console.error('Error creating address', e);
            alert('Error creando direccion: ' + this.formatError(e));
        }
    }

    // Seleccionar dirección para editar: carga los datos de la dirección en el formulario de edición
    selectAddress(index: number) {
        this.selectedAddressIndex = index;
        this.addressForm = { ...this.direcciones[index] };
    }

    // Actualizar dirección: si tiene ID, actualizar en backend, luego actualizar en la lista. Si no tiene ID, crear en backend, luego actualizar la entrada de la lista con el ID retornado por el backend
    async updateAddress() {
        if (this.selectedAddressIndex == null) return;
        const idx = this.selectedAddressIndex;
        const target = this.direcciones[idx];
        // Al actualizar una dirección, si el usuario no ha seleccionado un usuario existente (modo CREAR), se le asigna el usuarioId del usuario que se está creando/actualizando para que quede asociada, pero no se persiste esa relación en backend todavía (porque el usuario aún no existe en backend), solo se marca la dirección con un flag _needsAssign para procesarla después de crear el usuario
        const merged = {
            ...target,
            nombre_calle: (this.addressForm.nombre_calle !== undefined && this.addressForm.nombre_calle !== '') ? this.addressForm.nombre_calle : target?.nombre_calle,
            numero_calle: (this.addressForm.numero_calle !== undefined && this.addressForm.numero_calle !== '') ? this.addressForm.numero_calle : target?.numero_calle,
            direccion_principal: this.addressForm.direccion_principal ?? target?.direccion_principal,
            usuarioId: target?.usuarioId ?? this.selectedUserId
        };
        const payload = this.buildDireccionPayload(merged);
        try {
            if (target && target.id) {
                const resp: any = await this.userService.actualizarDireccion(target.id, payload);
                if (Array.isArray(resp)) throw resp[0];
                this.direcciones[idx] = this.normalizeDireccionFromApi(resp);
                if (this.direcciones[idx].direccion_principal) this.mainAddressIndex = idx;
            } else {
                const resp: any = await this.userService.crearDireccion(payload);
                if (Array.isArray(resp)) throw resp[0];
                this.direcciones[idx] = this.normalizeDireccionFromApi(resp);
                // Si la dirección no tenía usuarioId asignado (porque se creó en modo CREAR sin un usuario existente), se le asigna el usuarioId del usuario que se está creando/actualizando, y se marca con _needsAssign para indicar que esta asociación se hizo después de la creación inicial del usuario
                if (!this.direcciones[idx].usuarioId) (this.direcciones[idx] as any)._needsAssign = true;
                if (this.direcciones[idx].direccion_principal) this.mainAddressIndex = idx;
            }
        } catch (e) {
            console.error('Error updating/creating address', e);
            alert('Error actualizando direccion: ' + this.formatError(e));
        } finally {
            this.selectedAddressIndex = null;
            this.addressForm = { nombre_calle: '', numero_calle: '', direccion_principal: false };
        }
    }

    // Eliminar dirección: si tiene ID, eliminar en backend, luego eliminar de la lista. Si no tiene ID, solo eliminar de la lista (no se creó en backend aún)
    async deleteAddress() {
        if (this.selectedAddressIndex == null) return;
        const idx = this.selectedAddressIndex;
        const target = this.direcciones[idx];
        try {
            if (target && target.id) {
                const resp: any = await this.userService.eliminarDireccion(target.id);
                if (Array.isArray(resp)) throw resp[0];
            }
            this.direcciones.splice(idx, 1);
        } catch (e) {
            console.error('Error deleting address', e);
            alert('Error eliminando direccion: ' + this.formatError(e));
        } finally {
            this.selectedAddressIndex = null;
            this.addressForm = { nombre_calle: '', numero_calle: '', direccion_principal: false };
        }
    }

    // Cuando se marca una dirección como principal, se actualizan todas las demás para que no lo sean, y se persiste el cambio en el backend
    async toggleMainAddress(index: number) {
        const target = this.direcciones[index];
        this.direcciones.forEach((a,i) => a.direccion_principal = (i===index));
        this.mainAddressIndex = index;

        if (!target) return;
        
        // Al marcarla como principal, se la asignamos al usuario que estamos editando/creando
        if (this.selectedUserId != null) {
            target.usuarioId = this.selectedUserId;
            target._needsAssign = true;
        }

        const userId = this.selectedUserId;
        
        // Si no hay usuario seleccionado, no podemos persistir la relación todavía (modo CREAR)
        if (userId == null) return;

        for (let i = 0; i < this.direcciones.length; i++) {
            const a = this.direcciones[i];
            if (!a || !a.id) continue;
            // Solo persistimos los cambios para las direcciones que pertenecen a este usuario
            if (a.usuarioId !== userId) continue;
            const payload = this.buildDireccionPayload({ ...a, direccion_principal: (i===index), usuarioId: userId });
            try {
                const resp: any = await this.userService.actualizarDireccion(a.id, payload);
                if (Array.isArray(resp)) throw resp[0];
                const normalized = this.normalizeDireccionFromApi(resp);
                a.direccion_principal = normalized.direccion_principal;
                a.usuarioId = normalized.usuarioId;
            } catch (e) {
                console.error('Error persisting main flag', e);
            }
        }
    }

    // Helpers
    private normalizeDireccionFromApi(d: any) {
        return {
            id: d?.id ?? null,
            nombre_calle: d?.nombreCalle ?? d?.nombre_calle ?? '',
            numero_calle: d?.numeroCalle ?? d?.numero_calle ?? null,
            direccion_principal: d?.direccionPrincipal ?? d?.direccion_principal ?? false,
            usuarioId: d?.usuarioId ?? (d?.usuario ? d.usuario.id : null)
        };
    }

    // Construye el payload para crear/actualizar direcciones, asegurando que los campos estén en el formato esperado por la API
    private buildDireccionPayload(d: any) {
        return {
            nombre_calle: d.nombre_calle ?? d.nombre ?? '',
            numero_calle: (d.numero_calle !== undefined && d.numero_calle !== null && d.numero_calle !== '') ? (typeof d.numero_calle === 'string' ? (d.numero_calle ? parseInt(d.numero_calle,10) : null) : d.numero_calle) : null,
            direccion_principal: !!d.direccion_principal,
            usuario_id: d.usuarioId ?? d.usuario_id ?? null
        };
    }

    // Formatea errores para mostrar al usuario o para debugging
    private formatError(e: any): string {
        if (!e) return 'unknown error';
        if (typeof e === 'string') return e;
        if (e.message) return e.message;
        try {
            return JSON.stringify(e);
        } catch (_){
            return String(e);
        }
    }
}
