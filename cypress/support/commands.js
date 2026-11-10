// Crea una tarea vía API y devuelve el body de la respuesta
Cypress.Commands.add('crearTarea', (tarea = {}) => {
  return cy
    .request('POST', '/api/tareas', {
      titulo: `Tarea Cypress ${Date.now()}`,
      prioridad: 'media',
      ...tarea,
    })
    .its('body');
});

// Elimina una tarea vía API sin fallar si ya no existe
Cypress.Commands.add('eliminarTarea', (id) => {
  return cy.request({ method: 'DELETE', url: `/api/tareas/${id}`, failOnStatusCode: false });
});
