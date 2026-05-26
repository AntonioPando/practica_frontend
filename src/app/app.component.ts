import { Component } from '@angular/core';
import {Router, RouterOutlet} from "@angular/router";
import { CommonModule } from '@angular/common';
import { LoginService } from './core/services/login.service';
import { HeaderComponent } from './shared/header/header.component';

@Component({
  selector: "app-root",
  styleUrls: ['./app.component.css'],
  templateUrl: "./app.component.html",
  imports: [
    RouterOutlet, HeaderComponent, CommonModule
  ],
  providers: [
    LoginService
  ],
  standalone: true,

})
export class AppComponent {

  loginService: LoginService;

  get isLoggedIn(): boolean {
    return !!localStorage.getItem('nickUsuario');
  }

  constructor(private router: Router, loginService: LoginService) {
    this.loginService = loginService; 
  }

}
