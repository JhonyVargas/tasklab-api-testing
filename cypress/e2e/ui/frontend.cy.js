/// <reference types="cypress" />

// Pruebas de la interfaz: verifican que el frontend consume la API correctamente.
// cy.intercept() espía las peticiones HTTP reales que hace la página.
describe('Frontend TaskLab', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/tareas*').as('listar');
    cy.intercept('GET', '/api/stats').as('stats');
    cy.visit('/');
    cy.wait(['@listar', '@stats']);
  });

  it('muestra la API en línea y las estadísticas', () => {
    cy.get('[data-cy=api-status]').should('have.class', 'online').and('contain', 'API en línea');
    cy.get('@stats').its('response.body.total').then((total) => {
      cy.get('[data-cy=stat-total]').should('have.text', String(total));
    });
  });

  it('crea una tarea desde el formulario (POST 201)', () => {
    const titulo = `Tarea UI ${Date.now()}`;
    cy.intercept('POST', '/api/tareas').as('crear');

    cy.get('[data-cy=input-titulo]').type(titulo);
    cy.get('[data-cy=select-prioridad]').select('alta');
    cy.get('[data-cy=btn-agregar]').click();

    cy.wait('@crear').then(({ request, response }) => {
      expect(request.body).to.include({ titulo, prioridad: 'alta' });
      expect(response.statusCode).to.eq(201);
      cy.wrap(response.body.id).as('idCreado');
    });
    cy.contains('[data-cy=tarea]', titulo).should('be.visible').find('.badge').should('have.text', 'alta');
    cy.get('[data-cy=consola]').should('contain', 'POST').and('contain', '201');

    cy.get('@idCreado').then((id) => cy.eliminarTarea(id));
  });

  it('muestra el error de validación de la API (400)', () => {
    cy.get('[data-cy=input-titulo]').type('ab');
    cy.get('[data-cy=btn-agregar]').click();
    cy.get('[data-cy=form-error]').should('contain', 'al menos 3 caracteres');
  });

  it('completa y elimina una tarea', () => {
    cy.crearTarea({ titulo: 'Tarea para completar desde la UI' }).then((tarea) => {
      cy.reload();
      cy.intercept('PUT', `/api/tareas/${tarea.id}`).as('actualizar');
      cy.intercept('DELETE', `/api/tareas/${tarea.id}`).as('eliminar');

      cy.get(`[data-id=${tarea.id}] [data-cy=btn-toggle]`).click();
      cy.wait('@actualizar').its('response.body.completada').should('be.true');
      cy.get(`[data-id=${tarea.id}]`).should('have.class', 'done');

      cy.get(`[data-id=${tarea.id}] [data-cy=btn-eliminar]`).click({ force: true });
      cy.wait('@eliminar').its('response.statusCode').should('eq', 204);
      cy.get(`[data-id=${tarea.id}]`).should('not.exist');
    });
  });

  it('filtra las tareas completadas', () => {
    cy.contains('.tab', 'Completadas').click();
    cy.wait('@listar').its('request.url').should('include', 'estado=completada');
    cy.get('[data-cy=tarea]').each(($t) => expect($t).to.have.class('done'));
  });
});
