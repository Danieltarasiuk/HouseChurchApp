// Shared mock data used across House Churches, Members, Attendance, and Prayer pages

export interface HouseChurch {
  id: number;
  name: string;
  description: { en: string; es: string };
  meeting_day: { en: string; es: string };
  meeting_time: string;
  location: string;
  pastor_name: string;
  member_count: number;
}

export interface Member {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  house_church_id?: number;
  house_church_name: string | null;
}

export interface PrayerRequest {
  id: number;
  title: { en: string; es: string };
  description: { en: string; es: string };
  first_name: string;
  last_name: string;
  house_church_name: string;
  status: 'active' | 'answered';
  is_private: number;
  created_at: string;
  user_id: number;
}

export const MOCK_CHURCHES: HouseChurch[] = [
  { id: 1, name: 'Grace House', description: { en: 'Downtown house church for young professionals', es: 'Iglesia en casa del centro para jóvenes profesionales' }, meeting_day: { en: 'Wednesday', es: 'Miércoles' }, meeting_time: '7:00 PM', location: '123 Main St', pastor_name: 'James Wilson', member_count: 4 },
  { id: 2, name: 'Hope House', description: { en: 'Family-oriented house church', es: 'Iglesia en casa orientada a familias' }, meeting_day: { en: 'Thursday', es: 'Jueves' }, meeting_time: '6:30 PM', location: '456 Oak Ave', pastor_name: 'Sarah Martinez', member_count: 4 },
  { id: 3, name: 'Faith House', description: { en: 'House church for college students', es: 'Iglesia en casa para universitarios' }, meeting_day: { en: 'Tuesday', es: 'Martes' }, meeting_time: '8:00 PM', location: '789 Campus Dr', pastor_name: 'Mike Chen', member_count: 3 },
  { id: 4, name: 'Love House', description: { en: 'Neighborhood house church', es: 'Iglesia en casa del vecindario' }, meeting_day: { en: 'Wednesday', es: 'Miércoles' }, meeting_time: '7:00 PM', location: '321 Elm St', pastor_name: 'Rachel Brown', member_count: 3 },
  { id: 5, name: 'Joy House', description: { en: 'Newly planted house church', es: 'Iglesia en casa recién plantada' }, meeting_day: { en: 'Thursday', es: 'Jueves' }, meeting_time: '7:00 PM', location: '654 Pine Rd', pastor_name: 'David Kim', member_count: 3 },
];

export const MOCK_MEMBERS: Member[] = [
  { id: 1, first_name: 'Danny', last_name: 'T', email: 'danny@housechurch.app', phone: '555-0100', role: 'senior_pastor', house_church_name: null },
  { id: 2, first_name: 'James', last_name: 'Wilson', email: 'james@housechurch.app', phone: '555-0201', role: 'house_church_pastor', house_church_id: 1, house_church_name: 'Grace House' },
  { id: 3, first_name: 'Sarah', last_name: 'Martinez', email: 'sarah@housechurch.app', phone: '555-0202', role: 'house_church_pastor', house_church_id: 2, house_church_name: 'Hope House' },
  { id: 4, first_name: 'Mike', last_name: 'Chen', email: 'mike@housechurch.app', phone: '555-0203', role: 'house_church_pastor', house_church_id: 3, house_church_name: 'Faith House' },
  { id: 5, first_name: 'Rachel', last_name: 'Brown', email: 'rachel@housechurch.app', phone: '555-0204', role: 'house_church_pastor', house_church_id: 4, house_church_name: 'Love House' },
  { id: 6, first_name: 'David', last_name: 'Kim', email: 'david@housechurch.app', phone: '555-0205', role: 'house_church_pastor', house_church_id: 5, house_church_name: 'Joy House' },
  { id: 7, first_name: 'Anna', last_name: 'Lee', email: 'anna@email.com', phone: null, role: 'member', house_church_id: 1, house_church_name: 'Grace House' },
  { id: 8, first_name: 'Tom', last_name: 'Davis', email: 'tom@email.com', phone: null, role: 'member', house_church_id: 1, house_church_name: 'Grace House' },
  { id: 9, first_name: 'Lisa', last_name: 'Garcia', email: 'lisa@email.com', phone: null, role: 'member', house_church_id: 1, house_church_name: 'Grace House' },
  { id: 10, first_name: 'John', last_name: 'Smith', email: 'john@email.com', phone: null, role: 'member', house_church_id: 2, house_church_name: 'Hope House' },
  { id: 11, first_name: 'Mary', last_name: 'Johnson', email: 'mary@email.com', phone: null, role: 'member', house_church_id: 2, house_church_name: 'Hope House' },
  { id: 12, first_name: 'Peter', last_name: 'Wang', email: 'peter@email.com', phone: null, role: 'member', house_church_id: 2, house_church_name: 'Hope House' },
  { id: 13, first_name: 'Emma', last_name: 'Taylor', email: 'emma@email.com', phone: null, role: 'member', house_church_id: 3, house_church_name: 'Faith House' },
  { id: 14, first_name: 'Ryan', last_name: 'Anderson', email: 'ryan@email.com', phone: null, role: 'member', house_church_id: 3, house_church_name: 'Faith House' },
  { id: 15, first_name: 'Grace', last_name: 'Thomas', email: 'grace@email.com', phone: null, role: 'member', house_church_id: 4, house_church_name: 'Love House' },
  { id: 16, first_name: 'Josh', last_name: 'White', email: 'josh@email.com', phone: null, role: 'member', house_church_id: 4, house_church_name: 'Love House' },
  { id: 17, first_name: 'Hannah', last_name: 'Clark', email: 'hannah@email.com', phone: null, role: 'member', house_church_id: 5, house_church_name: 'Joy House' },
  { id: 18, first_name: 'Ben', last_name: 'Lewis', email: 'ben@email.com', phone: null, role: 'member', house_church_id: 5, house_church_name: 'Joy House' },
];

export const MOCK_PRAYERS: PrayerRequest[] = [
  { id: 1, title: { en: 'Job interview this Friday', es: 'Entrevista de trabajo este viernes' }, description: { en: 'I have a big interview at a new company. Please pray for peace and wisdom.', es: 'Tengo una entrevista importante en una empresa nueva. Por favor oren por paz y sabiduría.' }, first_name: 'Anna', last_name: 'Lee', house_church_name: 'Grace House', status: 'active', is_private: 0, created_at: '2026-04-03', user_id: 7 },
  { id: 2, title: { en: 'Mom recovering from surgery', es: 'Mamá recuperándose de cirugía' }, description: { en: 'My mom had knee surgery last week. Praying for quick recovery.', es: 'Mi mamá tuvo cirugía de rodilla la semana pasada. Orando por una pronta recuperación.' }, first_name: 'John', last_name: 'Smith', house_church_name: 'Hope House', status: 'active', is_private: 0, created_at: '2026-04-02', user_id: 10 },
  { id: 3, title: { en: 'Finals week coming up', es: 'Semana de exámenes finales' }, description: { en: 'Pray for focus and good rest during finals.', es: 'Oren por enfoque y buen descanso durante los finales.' }, first_name: 'Emma', last_name: 'Taylor', house_church_name: 'Faith House', status: 'active', is_private: 0, created_at: '2026-04-01', user_id: 13 },
  { id: 4, title: { en: 'Marriage restoration', es: 'Restauración matrimonial' }, description: { en: 'Going through a difficult season. Appreciate prayers.', es: 'Pasando por una temporada difícil. Agradezco sus oraciones.' }, first_name: 'Grace', last_name: 'Thomas', house_church_name: 'Love House', status: 'active', is_private: 1, created_at: '2026-03-30', user_id: 15 },
  { id: 5, title: { en: 'New baby on the way!', es: '¡Nuevo bebé en camino!' }, description: { en: 'We are expecting! Praying for a healthy pregnancy.', es: '¡Estamos esperando! Orando por un embarazo saludable.' }, first_name: 'Hannah', last_name: 'Clark', house_church_name: 'Joy House', status: 'active', is_private: 0, created_at: '2026-03-28', user_id: 17 },
];
