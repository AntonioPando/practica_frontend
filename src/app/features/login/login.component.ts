import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { LoginService } from "src/app/core/services/login.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
  standalone: true,
  imports: [
    FormsModule
  ],
})
export class LoginComponent {
  loginService: LoginService;
  nickUsuario: string = "";
  password: string = "";

  constructor(
    private router: Router,
    loginService: LoginService,
  ) {
    this.loginService = loginService;
  }

  async login() {
    console.log("Boton de login pulsado");
    let result = await this.loginService.iniciarSesion(this.nickUsuario, this.password);
    console.log("Resultado del login:", result);
    if (result === true) {
      console.log("Login exitoso, redirigiendo a /usuarios");
      localStorage.setItem("nickUsuario", this.nickUsuario);
      localStorage.setItem("password", this.password);
      this.router.navigate(['/usuarios']);
    } else {
      console.log("Login fallido: credenciales incorrectas");
      alert("Login fallido: credenciales incorrectas");
    }
  }
}
