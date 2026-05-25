import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import { Usuario } from '../models/user.model';
import to from "./utils.service";
import ConstUrls from "../../shared/contants/const-urls";


@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private http: HttpClient) {}

  async obtenerUsuarios() {
    const url = `${ConstUrls.API_URL}/api/v1/usuarios`;
    return await to(
        this.http
            .get<Usuario[]>(url)
            .toPromise()
    )
  }

  async obtenerDireccionesPorUsuario(usuarioId: number) {
    const url = `${ConstUrls.API_URL}/api/v1/usuario/${usuarioId}/direcciones`;
    return await to(
      this.http
        .get<any[]>(url)
        .toPromise()
    )
  }

}
