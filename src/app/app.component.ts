import { Component } from '@angular/core';
import {Router, RouterOutlet} from "@angular/router";
import { LoginService } from './core/services/login.service';

@Component({
  selector: "app-root",
  styleUrls: ['./app.component.css'],
  templateUrl: "./app.component.html",
  imports: [
    RouterOutlet,
  ],
  providers: [
    LoginService
  ],
  standalone: true,

})
export class AppComponent {

  loginService: LoginService;

  constructor(private router: Router, loginService: LoginService) {
    this.loginService = loginService; 
  }

}
