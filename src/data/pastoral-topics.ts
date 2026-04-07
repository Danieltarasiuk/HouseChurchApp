export interface PastoralTopic {
  key: string;
  label: { en: string; es: string };
  description: { en: string; es: string };
  questions: { en: string[]; es: string[] };
  verses: string[];
}

export const PASTORAL_TOPICS: PastoralTopic[] = [
  {
    key: 'sunday_attendance',
    label: { en: 'Sunday Service', es: 'Servicio Dominical' },
    description: {
      en: 'Are they consistently showing up to the main gathering?',
      es: '¿Están asistiendo consistentemente a la reunión principal?',
    },
    questions: {
      en: [
        "What's your experience been like on Sundays lately — are you finding it meaningful?",
        "When you miss, what's usually getting in the way?",
      ],
      es: [
        '¿Cómo ha sido tu experiencia los domingos últimamente — lo estás encontrando significativo?',
        'Cuando no vas, ¿qué suele impedírtelo?',
      ],
    },
    verses: ['Hebrews 10:24-25', 'Psalm 122:1', 'Acts 2:42'],
  },
  {
    key: 'house_church',
    label: { en: 'House Church', es: 'Iglesia en Casa' },
    description: {
      en: 'Are they engaged in their smaller community?',
      es: '¿Están involucrados en su comunidad más pequeña?',
    },
    questions: {
      en: [
        'Do you feel genuinely known by the people in your house church?',
        'Is there anyone you are growing closer to? Anyone you are concerned about?',
      ],
      es: [
        '¿Sientes que las personas en tu iglesia en casa te conocen genuinamente?',
        '¿Hay alguien con quien estés creciendo más cerca? ¿Alguien que te preocupe?',
      ],
    },
    verses: ['Acts 2:46-47', 'Romans 12:10', '1 Corinthians 12:25-27'],
  },
  {
    key: 'tithe_generosity',
    label: { en: 'Tithe & Generosity', es: 'Diezmo y Generosidad' },
    description: {
      en: 'Is their posture toward money one of faith or fear?',
      es: '¿Su postura hacia el dinero es de fe o de temor?',
    },
    questions: {
      en: [
        'How are you doing with giving right now?',
        'Is money a source of stress? Are you trusting God with your finances?',
      ],
      es: [
        '¿Cómo estás con el dar en este momento?',
        '¿El dinero es una fuente de estrés? ¿Estás confiando en Dios con tus finanzas?',
      ],
    },
    verses: ['Malachi 3:10', '2 Corinthians 9:6-7', 'Matthew 6:21', 'Proverbs 3:9-10'],
  },
  {
    key: 'discipleship',
    label: { en: 'Discipleship', es: 'Discipulado' },
    description: {
      en: 'Are they in a discipling relationship — giving or receiving?',
      es: '¿Están en una relación de discipulado — dando o recibiendo?',
    },
    questions: {
      en: [
        'Is anyone investing in you right now? Are you investing in anyone?',
        'What is one thing God has been teaching you lately?',
      ],
      es: [
        '¿Hay alguien invirtiéndose en ti ahora mismo? ¿Estás invirtiendo en alguien?',
        '¿Cuál es una cosa que Dios te ha estado enseñando últimamente?',
      ],
    },
    verses: ['Matthew 28:19-20', '2 Timothy 2:2', 'Colossians 1:28'],
  },
  {
    key: 'city_ministry',
    label: { en: 'City Ministry & Serving', es: 'Ministerio en la Ciudad' },
    description: {
      en: 'Are they using their gifts for the church and community?',
      es: '¿Están usando sus dones para la iglesia y la comunidad?',
    },
    questions: {
      en: [
        'How are you serving inside the church? Outside of it?',
        'Are there gifts you feel God has given you that you are not using yet?',
      ],
      es: [
        '¿Cómo estás sirviendo dentro de la iglesia? ¿Fuera de ella?',
        '¿Hay dones que sientes que Dios te ha dado pero que aún no estás usando?',
      ],
    },
    verses: ['1 Peter 4:10', 'Ephesians 4:12', 'Galatians 5:13', 'Matthew 25:35'],
  },
  {
    key: 'personal_devotional',
    label: { en: 'Personal Devotional', es: 'Devocional Personal' },
    description: {
      en: 'Is their private life with God alive?',
      es: '¿Su vida privada con Dios está viva?',
    },
    questions: {
      en: [
        'What does your time with God look like day-to-day?',
        'What are you reading? Are you hearing from Him? What is your prayer life honestly like right now?',
      ],
      es: [
        '¿Cómo es tu tiempo con Dios día a día?',
        '¿Qué estás leyendo? ¿Estás escuchando de Él? ¿Cómo es tu vida de oración honestamente ahora mismo?',
      ],
    },
    verses: ['Psalm 119:105', 'Joshua 1:8', 'Mark 1:35', 'Psalm 1:1-3'],
  },
  {
    key: 'evangelism',
    label: { en: 'Evangelism', es: 'Evangelismo' },
    description: {
      en: 'Are they living as a witness in their world?',
      es: '¿Están viviendo como testigos en su mundo?',
    },
    questions: {
      en: [
        'Who in your life does not know Jesus?',
        'Have you had any gospel conversations recently? Is there someone specific you are praying for?',
      ],
      es: [
        '¿Quién en tu vida no conoce a Jesús?',
        '¿Has tenido conversaciones del evangelio recientemente? ¿Hay alguien específico por quien estés orando?',
      ],
    },
    verses: ['2 Corinthians 5:20', 'Acts 1:8', 'Matthew 5:16', 'Romans 10:14'],
  },
];
