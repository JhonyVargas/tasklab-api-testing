/// <reference types="cypress" />

describe('API de Tareas - /api/tareas', () => {
  const creadas = [];

  // Limpieza: borra las tareas que crearon las pruebas
  after(() => {
    creadas.forEach((id) => cy.eliminarTarea(id));
  });

  context('Health check', () => {
    it('GET /api/health responde 200 y status ok', () => {
      cy.request('/api/health').then((res) => {
        expect(res.status).to.eq(200);
        expect(res.headers['content-type']).to.include('application/json');
        expect(res.body).to.have.property('status', 'ok');
        expect(res.body).to.have.all.keys('status', 'uptime', 'timestamp');
        expect(res.duration).to.be.lessThan(2000);
      });
    });
  });

  context('POST /api/tareas - Crear', () => {
    it('crea una tarea válida y responde 201', () => {
      const nueva = { titulo: 'Aprender cy.request()', descripcion: 'Pruebas de API', prioridad: 'alta' };

      cy.request('POST', '/api/tareas', nueva).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.headers).to.have.property('location', `/api/tareas/${res.body.id}`);
        expect(res.body).to.include(nueva);
        expect(res.body.id).to.be.a('number');
        expect(res.body.completada).to.eq(false);
        expect(Date.parse(res.body.creadaEn)).to.not.be.NaN;
        creadas.push(res.body.id);
      });
    });

    it('asigna prioridad "media" por defecto', () => {
      cy.crearTarea({ titulo: 'Sin prioridad', prioridad: undefined }).then((tarea) => {
        expect(tarea.prioridad).to.eq('media');
        creadas.push(tarea.id);
      });
    });

    it('elimina espacios sobrantes del título', () => {
      cy.crearTarea({ titulo: '   Título con espacios   ' }).then((tarea) => {
        expect(tarea.titulo).to.eq('Título con espacios');
        creadas.push(tarea.id);
      });
    });

    const invalidos = [
      { caso: 'sin título', body: { prioridad: 'alta' }, mensaje: '"titulo" es obligatorio' },
      { caso: 'título muy corto', body: { titulo: 'ab' }, mensaje: 'al menos 3 caracteres' },
      { caso: 'título muy largo', body: { titulo: 'x'.repeat(101) }, mensaje: 'no puede superar 100' },
      { caso: 'prioridad inválida', body: { titulo: 'Tarea', prioridad: 'urgente' }, mensaje: '"prioridad" debe ser' },
      { caso: 'completada no booleana', body: { titulo: 'Tarea', completada: 'si' }, mensaje: '"completada" debe ser booleano' },
    ];

    invalidos.forEach(({ caso, body, mensaje }) => {
      it(`responde 400 cuando el body tiene ${caso}`, () => {
        cy.request({ method: 'POST', url: '/api/tareas', body, failOnStatusCode: false }).then((res) => {
          expect(res.status).to.eq(400);
          expect(res.body.error).to.eq('Datos inválidos');
          expect(res.body.detalles.join(' ')).to.include(mensaje);
        });
      });
    });

    it('responde 400 cuando el JSON está mal formado', () => {
      cy.request({
        method: 'POST',
        url: '/api/tareas',
        body: '{"titulo": "roto"',
        headers: { 'Content-Type': 'application/json' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expect(res.body.error).to.eq('JSON mal formado');
      });
    });
  });

  context('GET /api/tareas - Listar y filtrar', () => {
    before(() => {
      cy.crearTarea({ titulo: 'Filtro pendiente Cypress', prioridad: 'baja' }).then((t) => creadas.push(t.id));
      cy.crearTarea({ titulo: 'Filtro completada Cypress', prioridad: 'alta', completada: true }).then((t) => creadas.push(t.id));
    });

    it('devuelve un arreglo de tareas con la estructura correcta', () => {
      cy.request('/api/tareas').then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array').and.not.be.empty;
        res.body.forEach((t) => {
          expect(t).to.have.all.keys('id', 'titulo', 'descripcion', 'prioridad', 'completada', 'creadaEn', 'actualizadaEn');
          expect(t.prioridad).to.be.oneOf(['baja', 'media', 'alta']);
        });
      });
    });

    it('ordena de la más reciente a la más antigua', () => {
      cy.request('/api/tareas').its('body').then((tareas) => {
        const ids = tareas.map((t) => t.id);
        expect(ids).to.deep.eq([...ids].sort((a, b) => b - a));
      });
    });

    it('filtra por estado=completada', () => {
      cy.request('/api/tareas?estado=completada').its('body').then((tareas) => {
        expect(tareas.every((t) => t.completada)).to.be.true;
      });
    });

    it('filtra por estado=pendiente', () => {
      cy.request('/api/tareas?estado=pendiente').its('body').then((tareas) => {
        expect(tareas.every((t) => !t.completada)).to.be.true;
      });
    });

    it('filtra por prioridad=alta', () => {
      cy.request('/api/tareas?prioridad=alta').its('body').then((tareas) => {
        expect(tareas).to.not.be.empty;
        expect(tareas.every((t) => t.prioridad === 'alta')).to.be.true;
      });
    });

    it('busca por texto con ?q=', () => {
      cy.request('/api/tareas?q=filtro pendiente').its('body').then((tareas) => {
        expect(tareas.map((t) => t.titulo)).to.include('Filtro pendiente Cypress');
      });
    });

    it('responde 400 con un filtro inválido', () => {
      cy.request({ url: '/api/tareas?estado=archivada', failOnStatusCode: false }).its('status').should('eq', 400);
    });
  });

  context('GET /api/tareas/:id - Obtener una', () => {
    it('devuelve la tarea solicitada', () => {
      cy.crearTarea({ titulo: 'Buscar por id' }).then((tarea) => {
        creadas.push(tarea.id);
        cy.request(`/api/tareas/${tarea.id}`).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body).to.deep.eq(tarea);
        });
      });
    });

    it('responde 404 si la tarea no existe', () => {
      cy.request({ url: '/api/tareas/999999', failOnStatusCode: false }).then((res) => {
        expect(res.status).to.eq(404);
        expect(res.body).to.deep.eq({ error: 'Tarea no encontrada' });
      });
    });
  });

  context('PUT /api/tareas/:id - Actualizar', () => {
    let tarea;

    beforeEach(() => {
      cy.crearTarea({ titulo: 'Tarea a editar', prioridad: 'baja' }).then((t) => {
        tarea = t;
        creadas.push(t.id);
      });
    });

    it('marca una tarea como completada', () => {
      cy.request('PUT', `/api/tareas/${tarea.id}`, { completada: true }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.completada).to.be.true;
        expect(res.body.titulo).to.eq('Tarea a editar');
      });
    });

    it('actualiza parcialmente título y prioridad', () => {
      cy.request('PUT', `/api/tareas/${tarea.id}`, { titulo: 'Tarea editada', prioridad: 'alta' }).then((res) => {
        expect(res.body).to.include({ titulo: 'Tarea editada', prioridad: 'alta' });
        expect(Date.parse(res.body.actualizadaEn)).to.be.at.least(Date.parse(tarea.actualizadaEn));
      });
      // El cambio persiste
      cy.request(`/api/tareas/${tarea.id}`).its('body.titulo').should('eq', 'Tarea editada');
    });

    it('responde 400 con datos inválidos', () => {
      cy.request({ method: 'PUT', url: `/api/tareas/${tarea.id}`, body: { prioridad: 'máxima' }, failOnStatusCode: false })
        .its('status').should('eq', 400);
    });

    it('responde 404 si la tarea no existe', () => {
      cy.request({ method: 'PUT', url: '/api/tareas/999999', body: { completada: true }, failOnStatusCode: false })
        .its('status').should('eq', 404);
    });
  });

  context('DELETE /api/tareas/:id - Eliminar', () => {
    it('elimina una tarea y responde 204 sin contenido', () => {
      cy.crearTarea({ titulo: 'Tarea a eliminar' }).then((tarea) => {
        cy.request('DELETE', `/api/tareas/${tarea.id}`).then((res) => {
          expect(res.status).to.eq(204);
          expect(res.body).to.be.empty;
        });
        // Ya no existe
        cy.request({ url: `/api/tareas/${tarea.id}`, failOnStatusCode: false }).its('status').should('eq', 404);
      });
    });

    it('responde 404 al eliminar una tarea inexistente', () => {
      cy.eliminarTarea(999999).its('status').should('eq', 404);
    });
  });

  context('Rutas desconocidas', () => {
    it('responde 404 en JSON para rutas /api inexistentes', () => {
      cy.request({ url: '/api/usuarios', failOnStatusCode: false }).then((res) => {
        expect(res.status).to.eq(404);
        expect(res.body.error).to.include('no existe');
      });
    });
  });
});
