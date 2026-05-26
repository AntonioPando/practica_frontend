import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.css"],
})
export class HeaderComponent {
  constructor(private router: Router) {}

  logout() {
    try {
      localStorage.removeItem("nickUsuario");
    } catch (e) {
      console.error("Error clearing storage", e);
    }
    this.router.navigate(["/login"]);
  }
}
