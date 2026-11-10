/// <reference types="cypress" />

describe('API de Estadísticas - /api/stats', () => {
  it('devuelve los contadores con la estructura esperada', () => {
    cy.request('/api/stats').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.all.keys('total', 'completadas', 'pendientes', 'progreso', 'porPrioridad');
      expect(res.body.porPrioridad).to.have.all.keys('baja', 'media', 'alta');
      expect(res.body.total).to.eq(res.body.completadas + res.body.pendientes);
      expect(res.body.progreso).to.be.within(0, 100);
    });
  });

  it('se actualiza al crear y completar una tarea', () => {
    cy.request('/api/stats').its('body').then((antes) => {
      cy.crearTarea({ titulo: 'Tarea para stats' }).then((tarea) => {
        cy.request('/api/stats').its('body').should((despues) => {
          expect(despues.total).to.eq(antes.total + 1);
          expect(despues.pendientes).to.eq(antes.pendientes + 1);
        });

        cy.request('PUT', `/api/tareas/${tarea.id}`, { completada: true });
        cy.request('/api/stats').its('body').should((despues) => {
          expect(despues.completadas).to.eq(antes.completadas + 1);
        });

        cy.eliminarTarea(tarea.id);
      });
    });
  });
});
