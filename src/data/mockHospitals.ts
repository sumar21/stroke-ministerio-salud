import { Hospital } from '../types';

export const mockHospitals: Hospital[] = [
  {
    id: 'h1',
    name: 'Hospital El Cruce (SAMIC)',
    isStrokeCenter: true,
    location: { lat: -34.786521, lng: -58.257342, address: 'Av. Calchaquí 5401, B1888 Florencio Varela, Provincia de Buenos Aires, Argentina' },
    distance: 12,
    email: 'emergencias@hospitalelcruce.org'
  },
  {
    id: 'h2',
    name: 'Hospital Nacional Prof. Alejandro Posadas',
    isStrokeCenter: true,
    location: { lat: -34.630632, lng: -58.575611, address: 'Av. Pres. Arturo U. Illia s/n, B1684 El Palomar, Provincia de Buenos Aires, Argentina' },
    distance: 25,
    email: 'acv@hospitalposadas.gov.ar'
  },
  {
    id: 'h3',
    name: 'Hospital General de Agudos Dr. Juan A. Fernández',
    isStrokeCenter: true,
    location: { lat: -34.581123, lng: -58.406145, address: 'Cerviño 3356, C1425 CABA, Argentina' },
    distance: 18,
    email: 'guardia@hospitalfernandez.org'
  },
  {
    id: 'h4',
    name: 'Hospital General de Agudos Dr. Cosme Argerich',
    isStrokeCenter: true,
    location: { lat: -34.632847, lng: -58.362489, address: 'Pi y Margall 750, C1155 CABA, Argentina' },
    distance: 5,
    email: 'stroke@hospitalargerich.org'
  },
  {
    id: 'h5',
    name: 'Hospital General de Agudos Carlos G. Durand',
    isStrokeCenter: true,
    location: { lat: -34.609412, lng: -58.437523, address: 'Av. Díaz Vélez 5044, C1405 CABA, Argentina' },
    distance: 8,
    email: 'emergencias@hospitaldurand.org'
  },
  {
    id: 'h6',
    name: 'Hospital General de Agudos J. M. Ramos Mejía',
    isStrokeCenter: true,
    location: { lat: -34.614456, lng: -58.406912, address: 'Gral. Urquiza 609, C1221 CABA, Argentina' },
    distance: 6,
    email: 'guardia@hospitalramosmejia.org'
  },
  {
    id: 'h7',
    name: 'Hospital General de Agudos Dr. Ignacio Pirovano',
    isStrokeCenter: true,
    location: { lat: -34.566123, lng: -58.472234, address: 'Av. Monroe 3555, C1430 CABA, Argentina' },
    distance: 14,
    email: 'acv@hospitalpirovano.org'
  },
  {
    id: 'h8',
    name: 'Hospital General de Agudos Dr. Teodoro Álvarez',
    isStrokeCenter: false,
    location: { lat: -34.624789, lng: -58.466123, address: 'Dr. Juan F. Aranguren 2701, C1406 CABA, Argentina' },
    distance: 10,
    email: 'contacto@hospitalalvarez.org'
  },
  {
    id: 'h9',
    name: 'Hospital General de Agudos Parmenio Piñero',
    isStrokeCenter: false,
    location: { lat: -34.640812, lng: -58.452834, address: 'Av. Varela 1301, C1406 CABA, Argentina' },
    distance: 11,
    email: 'guardia@hospitalpinero.org'
  },
  {
    id: 'h10',
    name: 'Hospital General de Agudos Donación Francisco Santojanni',
    isStrokeCenter: true,
    location: { lat: -34.643345, lng: -58.514456, address: 'Pilar 950, C1408 CABA, Argentina' },
    distance: 15,
    email: 'stroke@hospitalsantojanni.org'
  }
];
