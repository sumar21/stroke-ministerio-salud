import { Hospital } from '../types';

export const mockHospitals: Hospital[] = [
  {
    id: 'h1',
    name: 'Hospital El Cruce (SAMIC)',
    isStrokeCenter: true,
    location: {
      lat: -34.7865,
      lng: -58.2573,
      address: 'Av. Calchaquí 5401, Florencio Varela'
    },
    distance: 12
  },
  {
    id: 'h2',
    name: 'Hospital Nacional Prof. Alejandro Posadas',
    isStrokeCenter: true,
    location: {
      lat: -34.6306,
      lng: -58.5756,
      address: 'Av. Pres. Arturo U. Illia s/n, El Palomar'
    },
    distance: 25
  },
  {
    id: 'h3',
    name: 'Hospital General de Agudos Dr. Juan A. Fernández',
    isStrokeCenter: true,
    location: {
      lat: -34.5802,
      lng: -58.4054,
      address: 'Cerviño 3356, CABA'
    },
    distance: 18
  },
  {
    id: 'h4',
    name: 'Clínica Zonal (No Stroke)',
    isStrokeCenter: false,
    location: {
      lat: -34.6037,
      lng: -58.3816,
      address: 'Centro, CABA'
    },
    distance: 5
  }
];
