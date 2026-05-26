import { CommonModule } from "@angular/common";
import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { Router } from "@angular/router";
import { UserPopupComponent } from "src/app/features/user-popup/user-popup.component";
import { UserService } from "src/app/core/services/user.service";
import { Usuario } from "src/app/core/models/user.model";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-user-list",
  templateUrl: "./user-list.component.html",
  styleUrls: ["./user-list.component.css"],
  standalone: true,
  imports: [CommonModule, UserPopupComponent, FormsModule],
})
export class UserListComponent implements OnInit {

  @Output() cerrarPopUpOk = new EventEmitter<void>();
  @Output() cerrarPopUpCancel = new EventEmitter<void>();

  modoPopup: String = "CLOSED";
  estadoPopup: String = "CREAR";
  usuarios: Usuario[] = [];
  selectedUserId: number | null = null;
  confirmDeleteVisible: boolean = false;

  constructor(
    private router: Router,
    private userService: UserService,
  ) {
    this.userService = userService;
  }

  // Init: cargar usuarios y sus direcciones, redirigir a login si no hay usuario autenticado
  async ngOnInit() {
    await this.loadUsuarios();
  }

  async loadUsuarios() {
    const isLoggedIn = localStorage.getItem("nickUsuario");
    if (!isLoggedIn) {
      console.log("Usuario no autenticado, redirigiendo a /login");
      this.router.navigate(["/login"]);
      return;
    }

    const usuariosResp: any = await this.userService.obtenerUsuarios();
    this.usuarios = Array.isArray(usuariosResp) ? usuariosResp : [];

    // cargar direcciones para cada usuario en paralelo
    await Promise.all(
      this.usuarios.map(async (u: any) => {
        try {
          const direccionesResp: any =
            await this.userService.obtenerDireccionesPorUsuario(u.id);
          u.direcciones = Array.isArray(direccionesResp) ? direccionesResp : [];
        } catch {
          u.direcciones = [];
        }
      }),
    );

    this.selectedUserId = this.usuarios.length > 0 ? this.usuarios[0].id : null;
  }

  // Métodos para formatear datos de usuario para mostrar en la UI
  nombreCompleto(usuario: Usuario): string {
    const primer = usuario?.primerApellido || "";
    const segundo = usuario?.segundoApellido || "";
    const nombre = usuario?.nombre || "";
    const apellidos = primer + (segundo ? " " + segundo : "");
    return `${apellidos}, ${nombre}`.trim();
  }

  resolveGenero(usuario: Usuario): string {
    if (usuario.genero && usuario.genero.id === 1) {
      return "assets/images/Male.JPG";
    } else if (usuario.genero && usuario.genero.id === 2) {
      return "assets/images/Female.JPG";
    } else {
      return "assets/images/Other.PNG";
    }
  }

  // Calcula la edad del usuario a partir de su fecha de nacimiento
  calcularEdad(fechaNacimiento: Date): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  getPuestoTrabajoNombre(usuario: Usuario): string {
    return (
      (usuario as any).puestoDeTrabajo?.nombre ||
      (usuario as any).puestoTrabajo?.nombre ||
      ""
    );
  }

  // Obtiene el texto de la dirección principal del usuario
  obtenerDireccionPrincipalTexto(usuario: Usuario): string {
    const direcciones =
      (usuario as any).direcciones || (usuario as any).direccionesUsuario || [];
    const principal = direcciones.find((d: any) => {
      const val = d.direccionPrincipal ?? d.direccion_principal;
      return val === true || val === 1 || val === "true";
    });
    if (principal) {
      const calle = principal.nombreCalle || principal.nombre_calle || "";
      const numero = principal.numeroCalle || principal.numero_calle || "";
      return numero ? `${calle}, ${numero}`.trim() : calle;
    }
    // fallback si existe campo directo
    const dp =
      (usuario as any).direccionPrincipal ||
      (usuario as any).direccion_principal;
    if (dp) return dp;
    return "";
  }

  // Cuenta cuántas direcciones adicionales tiene el usuario, excluyendo la principal
  contarDireccionesExtras(usuario: Usuario): number {
    const direcciones = (usuario as any).direcciones || [];
    return direcciones.filter((d: any) => {
      const val = d.direccionPrincipal ?? d.direccion_principal;
      return !(val === true || val === 1 || val === "true");
    }).length;
  }

  onCerrarPopUpOk() {
    this.modoPopup = "CLOSED";
    // refresh list after popup saved
    this.loadUsuarios().catch((e) => console.error("Error reloading users", e));
  }

  onCerrarPopUpCancel() {
    this.modoPopup = "CLOSED";
  }

  launchPopup() {
    this.modoPopup = "LAUNCH";
  }

  launchPopupUpdate() {
    this.modoPopup = "LAUNCH";
    this.estadoPopup = "ACTUALIZAR";
  }

  launchPopupCreate() {
    this.modoPopup = "LAUNCH";
    this.estadoPopup = "CREAR";
  }

  openConfirmDelete() {
    if (this.selectedUserId == null) {
      alert('No hay usuario seleccionado para eliminar');
      return;
    }
    this.confirmDeleteVisible = true;
  }

  cancelDelete() {
    this.confirmDeleteVisible = false;
  }

  async confirmDelete() {
    if (this.selectedUserId == null) return;
    try {
      const resp: any = await this.userService.eliminarUsuario(this.selectedUserId);
      if (Array.isArray(resp)) {
        const err = resp[0];
        alert('Error eliminando usuario: ' + (err?.message || JSON.stringify(err)));
        return;
      }
      this.confirmDeleteVisible = false;
      // refresh list
      await this.loadUsuarios();
    } catch (e) {
      console.error('Error deleting user', e);
      alert('Error eliminando usuario: ' + ((e as any)?.message || String(e)));
    }
  }

  // @TODO: Implementar propiedades, atributos, métodos... necesarios para el funcionamiento del listado de usuarios
}
