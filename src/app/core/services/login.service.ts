import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import to from "./utils.service";


@Injectable({
  providedIn: 'root'
})
export class LoginService {
  constructor(private http: HttpClient) {}

  async iniciarSesion(nickUsuario: string, password: string) {
    let params = new HttpParams()
      .set('nickUsuario', nickUsuario)
      .set('password', password);
    return await to(
        this.http
          .post<boolean>(
            'http://localhost:8080/api/v1/usuarios/login',
            null,
            {
              params: params
            }
          )
            .toPromise()
    )
  }


}
