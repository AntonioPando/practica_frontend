import { Component, EventEmitter, OnInit, Output, Input } from "@angular/core";
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

        // Cargar direcciones para el usuario seleccionado (en modo actualización)
        try {
            const dirs: any = await this.userService.obtenerTodasDirecciones();
            this.direcciones = (Array.isArray(dirs) ? dirs : []).map((d: any) => this.normalizeDireccionFromApi(d));
            if (this.selectedUserId != null) {
                const idx = this.direcciones.findIndex(d => d.usuarioId === this.selectedUserId && !!d.direccion_principal);
                if (idx >= 0) this.mainAddressIndex = idx;
            }
        } catch (e) {
            this.direcciones = [];
            console.error('Error loading direcciones', e);
        }
    }

    // ---- Eventos y acciones ----------------------------------------
    async onSave() {
        console.log('Save user');
        const usuarioPost: any = {
            nickUsuario: this.nickUsuario,
            password: this.password,
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

        const createdResp: any = await this.userService.crearUsuario(usuarioPost);
        if (Array.isArray(createdResp)) {
            const err = createdResp[0];
            alert('Error creando usuario: ' + this.formatError(err));
            return;
        }

        const created = createdResp;
        const userId = created?.id || created?.body?.id || null;

        this.cerrarPopUpOk.emit();
    }

    // Cerrar sin guardar
    onCancel() {
        this.cerrarPopUpCancel.emit();
    }

    // Direcciones CRUD
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

    selectAddress(index: number) {
        this.selectedAddressIndex = index;
        this.addressForm = { ...this.direcciones[index] };
    }

    async updateAddress() {
        if (this.selectedAddressIndex == null) return;
        const idx = this.selectedAddressIndex;
        const target = this.direcciones[idx];
        // Merge but do not overwrite existing values with empty strings from the form
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
                // mark for assignment if backend returned usuarioId null
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

    // Toggle dirección principal, asegurando que solo una pueda serlo y persistiendo el cambio
    async toggleMainAddress(index: number) {
        const target = this.direcciones[index];
        this.direcciones.forEach((a,i) => a.direccion_principal = (i===index));
        this.mainAddressIndex = index;

        if (!target) return;
        const userId = target.usuarioId ?? this.selectedUserId;
        for (let i = 0; i < this.direcciones.length; i++) {
            const a = this.direcciones[i];
            if (!a || !a.id) continue;
            // Only persist changes for addresses that belong to the same usuarioId
            if (a.usuarioId !== userId) continue;
            const payload = this.buildDireccionPayload({ ...a, direccion_principal: (i===index) });
            try {
                const resp: any = await this.userService.actualizarDireccion(a.id, payload);
                if (Array.isArray(resp)) throw resp[0];
                const normalized = this.normalizeDireccionFromApi(resp);
                a.direccion_principal = normalized.direccion_principal;
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
