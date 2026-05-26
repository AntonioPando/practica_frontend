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

  async crearUsuario(usuarioPost: any) {
    const url = `${ConstUrls.API_URL}/api/v1/usuarios`;
    return await to(this.http.post<any>(url, usuarioPost).toPromise());
  }

  async crearDireccion(direccion: any) {
    const url = `${ConstUrls.API_URL}/api/v1/direcciones`;
    return await to(this.http.post<any>(url, direccion).toPromise());
  }

  async actualizarDireccion(id: number, direccion: any) {
    const url = `${ConstUrls.API_URL}/api/v1/direcciones/${id}`;
    return await to(this.http.put<any>(url, direccion).toPromise());
  }

  async eliminarDireccion(id: number) {
    const url = `${ConstUrls.API_URL}/api/v1/direcciones/${id}`;
    return await to(this.http.delete<any>(url).toPromise());
  }

  async obtenerGeneros() {
    const url = `${ConstUrls.API_URL}/api/v1/generos`;
    try {
      const data = await this.http.get<any[]>(url).toPromise();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error obtenerGeneros', err);
      return [];
    }
  }

  async obtenerPuestos() {
    const url = `${ConstUrls.API_URL}/api/v1/puestos`;
    try {
      const data = await this.http.get<any[]>(url).toPromise();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error obtenerPuestos', err);
      return [];
    }
  }

  async obtenerTodasDirecciones() {
    const url = `${ConstUrls.API_URL}/api/v1/direcciones`;
    try {
      const data = await this.http.get<any[]>(url).toPromise();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error obtenerTodasDirecciones', err);
      return [];
    }
  }

  async eliminarUsuario(id: number) {
    const url = `${ConstUrls.API_URL}/api/v1/usuarios/${id}`;
    return await to(this.http.delete<any>(url).toPromise());
  }

}
