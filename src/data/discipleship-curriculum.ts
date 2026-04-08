// Auto-generated from preview.html curriculum data
// Type definitions and data export for 7&7 Discipleship module

export interface BilingualString {
  en: string;
  es: string;
}

export interface BilingualArray {
  en: string[];
  es: string[];
}

export interface Passage {
  title: BilingualString;
  scripture: BilingualString;
  reflect: BilingualString;
  apply: BilingualString;
}

export interface Day {
  day: number;
  section: 'know' | 'grow';
  passages: Passage[];
}

export interface SelfEvalItem {
  en: string;
  es: string;
}

export interface Incubator {
  title: BilingualString;
  selfEval: SelfEvalItem[];
}

export interface Week {
  number: number;
  know: BilingualString;
  grow: BilingualString;
  centralConcept: BilingualString;
  memoryVerses: BilingualArray;
  actionStep: BilingualString;
  growActionStep: BilingualString;
  days: Day[];
  incubator?: Incubator[];
}

export interface DiscipleshipCurriculum {
  weeks: Week[];
}

export function loc(obj: BilingualString | BilingualArray, lang: string): string | string[] {
  if (lang === 'es') return obj.es;
  return obj.en;
}

export const DISCIPLESHIP_CURRICULUM: DiscipleshipCurriculum = {
  weeks: [

    // ─── WEEK 1 ───────────────────────────────────────────────────────────────
    {
      number: 1,
      know: { en: 'What is the Gospel?', es: '¿Qué es el Evangelio?' },
      grow: { en: 'What is Salvation?', es: '¿Qué es la Salvación?' },
      centralConcept: {
        en: 'The Gospel is the good news of salvation through Jesus Christ: a story of love, redemption, and eternal hope. This message of forgiveness answers life\'s most important questions through eight essential truths.\n\nSalvation is being rescued from the penalty, power, and presence of sin, and being restored to a relationship with God through Jesus Christ.',
        es: 'El Evangelio es la buena noticia de la salvación a través de Jesucristo: una historia de amor, redención y esperanza eterna. Este mensaje de perdón responde a las preguntas más importantes de la vida a través de ocho verdades esenciales.\n\nLa salvación es ser rescatado del castigo, el poder y la presencia del pecado, y ser restaurado a una relación con Dios a través de Jesucristo.',
      },
      memoryVerses: {
        en: ['John 3:16-17', 'Ephesians 2:4-5'],
        es: ['Juan 3:16-17', 'Efesios 2:4-5'],
      },
      actionStep: {
        en: 'The Gospel Summarized (Romans 1:3-4)\n\nReflection: Take time to reflect on which part of the Gospel story feels most personal to you right now.\n\nAction Step: What hesitation do I have in taking my next step of faith and trusting Jesus more? What is my next step of obeying Jesus in every area of my life?',
        es: 'El Evangelio Resumido (Romanos 1:3-4)\n\nReflexión: Dedica tiempo para reflexionar en qué parte de la historia del Evangelio se siente más personal para ti en este momento.\n\nAcción a Seguir: ¿Qué dudas tengo para dar mi próximo paso de fe y confiar más en Jesús? ¿Cuál es mi próximo paso para obedecer a Jesús en cada área de mi vida?',
      },
      growActionStep: {
        en: 'Celebrate your salvation by sharing your story with someone this week.\n\nIf you have not yet trusted Jesus as your Savior, consider taking that step today.',
        es: 'Celebra tu salvación compartiendo tu historia con alguien esta semana.\n\nSi aún no has confiado en Jesús como tu Salvador, considera dar ese paso hoy.',
      },
      days: [
        {
          day: 1,
          section: 'know',
          passages: [
            {
              title: { en: 'Creation', es: 'Creación' },
              scripture: { en: 'Genesis 1:1', es: 'Génesis 1:1' },
              reflect: {
                en: 'What does this verse teach about God\'s authority and purpose in Creation?',
                es: '¿Qué enseña este versículo sobre la autoridad y el propósito de Dios en la Creación?',
              },
              apply: {
                en: 'How does recognizing God as Creator impact the way you see your own life and purpose?',
                es: '¿Cómo impacta el reconocer a Dios como Creador la manera en que ves tu propia vida y propósito?',
              },
            },
            {
              title: { en: 'The Fall', es: 'La Caída' },
              scripture: { en: 'Romans 3:23', es: 'Romanos 3:23' },
              reflect: {
                en: 'How does this verse explain the universal need for salvation?',
                es: '¿Cómo explica este versículo la necesidad universal de salvación?',
              },
              apply: {
                en: 'In what areas of your life do you see the effects of sin and the fallen condition?',
                es: '¿En qué áreas de tu vida ves los efectos del pecado y la condición caída?',
              },
            },
            {
              title: { en: 'Works', es: 'Obras' },
              scripture: { en: 'Ephesians 2:8-9', es: 'Efesios 2:8-9' },
              reflect: {
                en: 'What does this passage teach about the role of grace versus works in salvation?',
                es: '¿Qué enseña este pasaje sobre el papel de la gracia frente a las obras en la salvación?',
              },
              apply: {
                en: 'Are you resting in God\'s grace, or are you still trying to earn His approval?',
                es: '¿Estás descansando en la gracia de Dios, o todavía intentas ganarte su aprobación?',
              },
            },
          ],
        },
        {
          day: 2,
          section: 'know',
          passages: [
            {
              title: { en: 'Incarnation', es: 'Encarnación' },
              scripture: { en: 'Titus 2:11', es: 'Tito 2:11' },
              reflect: {
                en: 'How does this verse describe the coming of Jesus and its importance?',
                es: '¿Cómo describe este versículo la venida de Jesús y su importancia?',
              },
              apply: {
                en: 'How can you live today in response to the grace that has been revealed through Christ?',
                es: '¿Cómo puedes vivir hoy en respuesta a la gracia que ha sido revelada a través de Cristo?',
              },
            },
            {
              title: { en: 'Crucifixion', es: 'Crucifixión' },
              scripture: { en: '2 Corinthians 5:21', es: '2 Corintios 5:21' },
              reflect: {
                en: 'What does this verse reveal about Jesus\' purpose in dying on the cross?',
                es: '¿Qué revela este versículo sobre el propósito de Jesús al morir en la cruz?',
              },
              apply: {
                en: 'How does the cross influence your perspective on forgiveness and your identity?',
                es: '¿Cómo influye la cruz en tu perspectiva sobre el perdón y tu identidad?',
              },
            },
            {
              title: { en: 'Resurrection', es: 'Resurrección' },
              scripture: { en: 'Romans 8:11', es: 'Romanos 8:11' },
              reflect: {
                en: 'What does the resurrection mean for those who believe in Jesus?',
                es: '¿Qué significa la resurrección para los que creen en Jesús?',
              },
              apply: {
                en: 'How does the promise of new life impact the way you face challenges or suffering?',
                es: '¿Cómo impacta la promesa de nueva vida en la manera en que enfrentas los desafíos o el sufrimiento?',
              },
            },
          ],
        },
        {
          day: 3,
          section: 'know',
          passages: [
            {
              title: { en: 'Salvation', es: 'Salvación' },
              scripture: { en: 'Romans 10:9-10', es: 'Romanos 10:9-10' },
              reflect: {
                en: 'What are the two key elements for receiving salvation according to this passage?',
                es: '¿Cuáles son los dos elementos clave para recibir la salvación según este pasaje?',
              },
              apply: {
                en: 'Have you personally made this confession and commitment to Christ?',
                es: '¿Has hecho personalmente esta confesión y compromiso con Cristo?',
              },
            },
            {
              title: { en: 'Return', es: 'El Regreso' },
              scripture: { en: '1 Thessalonians 4:14-18', es: '1 Tesalonicenses 4:14-18' },
              reflect: {
                en: 'What hope does this passage give believers about the future?',
                es: '¿Qué esperanza da este pasaje a los creyentes sobre el futuro?',
              },
              apply: {
                en: 'How should the promise of Christ\'s return influence the way you live today?',
                es: '¿Cómo debe influir la promesa del regreso de Cristo en la manera en que vives hoy?',
              },
            },
          ],
        },
        {
          day: 4,
          section: 'grow',
          passages: [
            {
              title: { en: 'God Loves Us', es: 'Dios Nos Ama' },
              scripture: { en: 'John 3:16-17', es: 'Juan 3:16-17' },
              reflect: {
                en: 'What does this passage reveal about God\'s motivation to save us?',
                es: '¿Qué revela este pasaje sobre la motivación de Dios para salvarnos?',
              },
              apply: {
                en: 'How can you live today trusting in God\'s love for you?',
                es: '¿Cómo puedes vivir hoy confiando en el amor de Dios por ti?',
              },
            },
            {
              title: { en: 'We All Need Salvation', es: 'Todos Necesitamos Salvación' },
              scripture: { en: 'Romans 3:23', es: 'Romanos 3:23' },
              reflect: {
                en: 'What does Paul say about the condition of humanity?',
                es: '¿Qué dice Pablo sobre la condición de la humanidad?',
              },
              apply: {
                en: 'Why is it important to recognize your need for a Savior?',
                es: '¿Por qué es importante reconocer tu necesidad de un Salvador?',
              },
            },
            {
              title: { en: 'Jesus is the Solution', es: 'Jesús es la Solución' },
              scripture: { en: 'Romans 5:8', es: 'Romanos 5:8' },
              reflect: {
                en: 'How does Jesus\' sacrifice demonstrate God\'s love and provide a way for salvation?',
                es: '¿Cómo demuestra el sacrificio de Jesús el amor de Dios y provee un camino para la salvación?',
              },
              apply: {
                en: 'How can you respond to Jesus\' sacrifice in your daily life?',
                es: '¿Cómo puedes responder al sacrificio de Jesús en tu vida diaria?',
              },
            },
          ],
        },
        {
          day: 5,
          section: 'grow',
          passages: [
            {
              title: { en: 'We Must Believe and Receive Jesus as Our Savior', es: 'Debemos Creer y Recibir a Jesús como Nuestro Salvador' },
              scripture: { en: 'Romans 10:9, 13', es: 'Romanos 10:9, 13' },
              reflect: {
                en: 'What two things are necessary for salvation according to Paul?',
                es: '¿Cuáles son las dos cosas necesarias para la salvación según Pablo?',
              },
              apply: {
                en: 'Have you personally acknowledged Jesus as your Lord and believed in your heart? How can you share this truth with someone else?',
                es: '¿Has reconocido personalmente a Jesús como tu Señor y creído en tu corazón? ¿Cómo puedes compartir esta verdad con alguien más?',
              },
            },
            {
              title: { en: 'God Gives Us Peace', es: 'Dios Nos Da Paz' },
              scripture: { en: 'Romans 5:1-3', es: 'Romanos 5:1-3' },
              reflect: {
                en: 'What kind of peace does salvation bring?',
                es: '¿Qué tipo de paz trae la salvación?',
              },
              apply: {
                en: 'How does this peace impact your daily worries and anxieties?',
                es: '¿Cómo impacta esta paz en tus preocupaciones y ansiedades diarias?',
              },
            },
            {
              title: { en: 'Jesus Secures Our Salvation', es: 'Jesús Asegura Nuestra Salvación' },
              scripture: { en: 'Romans 8:38-39', es: 'Romanos 8:38-39' },
              reflect: {
                en: 'What guarantees does Paul mention about the permanent nature of salvation?',
                es: '¿Qué garantías menciona Pablo sobre la naturaleza permanente de la salvación?',
              },
              apply: {
                en: 'How does this assurance influence the way you live and face challenges?',
                es: '¿Cómo influye esta seguridad en la manera en que vives y enfrentas los desafíos?',
              },
            },
          ],
        },
        {
          day: 6,
          section: 'grow',
          passages: [
            {
              title: { en: 'Salvation is Sealed by the Holy Spirit', es: 'La Salvación es Sellada por el Espíritu Santo' },
              scripture: { en: 'Ephesians 1:11-14', es: 'Efesios 1:11-14' },
              reflect: {
                en: 'What role does the Holy Spirit play in our salvation?',
                es: '¿Qué papel juega el Espíritu Santo en nuestra salvación?',
              },
              apply: {
                en: 'How can you be more aware of the presence of the Holy Spirit in your life and trust Him more?',
                es: '¿Cómo puedes ser más consciente de la presencia del Espíritu Santo en tu vida y confiar más en Él?',
              },
            },
            {
              title: { en: 'We Are a New Creation', es: 'Somos una Nueva Creación' },
              scripture: { en: '2 Corinthians 5:17', es: '2 Corintios 5:17' },
              reflect: {
                en: 'What does it mean to be a new creation in Christ?',
                es: '¿Qué significa ser una nueva creación en Cristo?',
              },
              apply: {
                en: 'What habits or attitudes do you need to leave behind as part of your new life?',
                es: '¿Qué hábitos o actitudes necesitas dejar atrás como parte de tu nueva vida?',
              },
            },
          ],
        },
      ],
    },

    // ─── WEEK 2 ───────────────────────────────────────────────────────────────
    {
      number: 2,
      know: { en: 'What is Scripture?', es: '¿Qué es la Escritura?' },
      grow: { en: 'How Do I Read the Bible?', es: '¿Cómo Leo la Biblia?' },
      centralConcept: {
        en: 'Scripture is the inspired Word of God that gives life and tells the story of creation and redemption. It reveals God\'s will and guides us to Jesus.\n\nGod gave us the Bible to reveal who He is, how He acts, and how we are to live in response to Him. Reading Scripture intentionally allows us to know Jesus and walk in His truth.',
        es: 'La Escritura es la Palabra inspirada de Dios que da vida y cuenta la historia de la creación y la redención. Revela la voluntad de Dios y nos guía hacia Jesús.\n\nDios nos dio la Biblia para revelar quién es Él, cómo actúa y cómo debemos vivir en respuesta a Él. Leer las Escrituras intencionalmente nos permite conocer a Jesús y caminar en su verdad.',
      },
      memoryVerses: {
        en: ['Psalm 119:9', 'Matthew 4:4'],
        es: ['Salmo 119:9', 'Mateo 4:4'],
      },
      actionStep: {
        en: 'Commit to spending daily time this week reading Scripture and reflecting.\n\nAsk the Holy Spirit to open your eyes to see Jesus in every passage.',
        es: 'Comprométete a dedicar tiempo diario esta semana leyendo las Escrituras y reflexionando.\n\nPide al Espíritu Santo que abra tus ojos para ver a Jesús en cada pasaje.',
      },
      growActionStep: {
        en: 'Spend time each day this week reading, reflecting on, and responding to God\'s Word.',
        es: 'Dedica tiempo cada día esta semana leyendo, reflexionando y respondiendo a la Palabra de Dios.',
      },
      days: [
        {
          day: 1,
          section: 'know',
          passages: [
            {
              title: { en: 'All Scripture is God-Breathed', es: 'Toda la Escritura es Inspirada por Dios' },
              scripture: { en: '2 Timothy 3:14-17', es: '2 Timoteo 3:14-17' },
              reflect: {
                en: 'What does it mean that Scripture is "inspired by God," and how should this truth shape our view of the Bible?',
                es: '¿Qué significa que la Escritura sea "inspirada por Dios" y cómo debe esta verdad moldear nuestra visión de la Biblia?',
              },
              apply: {
                en: 'How can you show greater respect for Scripture and commit to reading it regularly?',
                es: '¿Cómo puedes mostrar mayor respeto por las Escrituras y comprometerte a leerlas regularmente?',
              },
            },
            {
              title: { en: 'Written Under God\'s Guidance', es: 'Escrita Bajo la Guía de Dios' },
              scripture: { en: '2 Peter 1:21', es: '2 Pedro 1:21' },
              reflect: {
                en: 'How does the involvement of the Holy Spirit establish the authority of Scripture?',
                es: '¿Cómo establece la participación del Espíritu Santo la autoridad de la Escritura?',
              },
              apply: {
                en: 'Ask the Holy Spirit for guidance in prayer as you read and study the Bible.',
                es: 'Pide al Espíritu Santo que te guíe en oración mientras lees y estudias la Biblia.',
              },
            },
            {
              title: { en: 'God\'s Word Works in Our Lives', es: 'La Palabra de Dios Obra en Nuestras Vidas' },
              scripture: { en: 'Hebrews 4:12', es: 'Hebreos 4:12' },
              reflect: {
                en: 'How is the power and effectiveness of Scripture described?',
                es: '¿Cómo se describe el poder y la eficacia de las Escrituras?',
              },
              apply: {
                en: 'Reflect on a time when Scripture spoke directly into your life or a decision.',
                es: 'Reflexiona en un momento cuando las Escrituras hablaron directamente a tu vida o a una decisión.',
              },
            },
          ],
        },
        {
          day: 2,
          section: 'know',
          passages: [
            {
              title: { en: 'Jesus Treated Scripture as Sacred', es: 'Jesús Trató las Escrituras como Sagradas' },
              scripture: { en: 'Matthew 4:4', es: 'Mateo 4:4' },
              reflect: {
                en: 'How did Jesus show the importance of Scripture in daily life?',
                es: '¿Cómo mostró Jesús la importancia de las Escrituras en la vida diaria?',
              },
              apply: {
                en: 'How can you follow Jesus\' example by prioritizing the Word of God?',
                es: '¿Cómo puedes seguir el ejemplo de Jesús priorizando la Palabra de Dios?',
              },
            },
            {
              title: { en: 'Scripture is Necessary to Know the Gospel', es: 'Las Escrituras son Necesarias para Conocer el Evangelio' },
              scripture: { en: 'Romans 10:13-17', es: 'Romanos 10:13-17' },
              reflect: {
                en: 'What role does Scripture play in leading people to faith?',
                es: '¿Qué papel juegan las Escrituras para llevar a las personas a la fe?',
              },
              apply: {
                en: 'How can you use Scripture to share the Gospel with others?',
                es: '¿Cómo puedes usar las Escrituras para compartir el Evangelio con otros?',
              },
            },
            {
              title: { en: 'Scripture Sustains Our Life with God', es: 'Las Escrituras Sostienen Nuestra Vida con Dios' },
              scripture: { en: 'Psalm 19:7-8', es: 'Salmo 19:7-8' },
              reflect: {
                en: 'How does Scripture nourish and guide the believer\'s soul?',
                es: '¿Cómo nutren y guían las Escrituras el alma del creyente?',
              },
              apply: {
                en: 'How can you incorporate Scripture into your daily spiritual practices?',
                es: '¿Cómo puedes incorporar las Escrituras en tus prácticas espirituales diarias?',
              },
            },
          ],
        },
        {
          day: 3,
          section: 'know',
          passages: [
            {
              title: { en: 'Scripture Reveals God\'s Will', es: 'Las Escrituras Revelan la Voluntad de Dios' },
              scripture: { en: 'Psalm 1:1-6', es: 'Salmo 1:1-6' },
              reflect: {
                en: 'How does delighting in Scripture guide a person\'s life and decisions?',
                es: '¿Cómo guía el deleitarse en las Escrituras la vida y las decisiones de una persona?',
              },
              apply: {
                en: 'What steps can you take to meditate more intentionally on God\'s Word?',
                es: '¿Qué pasos puedes tomar para meditar más intencionalmente en la Palabra de Dios?',
              },
            },
            {
              title: { en: 'All Scripture Points to Jesus', es: 'Toda la Escritura Apunta a Jesús' },
              scripture: { en: 'John 1:29', es: 'Juan 1:29' },
              reflect: {
                en: 'How does the Bible ultimately direct us to Jesus?',
                es: '¿Cómo nos dirige la Biblia finalmente hacia Jesús?',
              },
              apply: {
                en: 'How can you find Jesus in every passage you read?',
                es: '¿Cómo puedes encontrar a Jesús en cada pasaje que lees?',
              },
            },
          ],
        },
        {
          day: 4,
          section: 'grow',
          passages: [
            {
              title: { en: 'Focus Your Mind and Heart on Knowing Jesus', es: 'Enfoca tu Mente y Corazón en Conocer a Jesús' },
              scripture: { en: 'John 20:31', es: 'Juan 20:31' },
              reflect: {
                en: 'For what purpose does John say the Bible was written?',
                es: '¿Con qué propósito dice Juan que fue escrita la Biblia?',
              },
              apply: {
                en: 'How can you focus your Bible reading with the goal of personally knowing Jesus?',
                es: '¿Cómo puedes enfocar tu lectura de la Biblia con el objetivo de conocer personalmente a Jesús?',
              },
            },
            {
              title: { en: 'Begin by Reading the Gospels', es: 'Comienza Leyendo los Evangelios' },
              scripture: { en: 'Romans 15:4-5', es: 'Romanos 15:4-5' },
              reflect: {
                en: 'What role does Scripture play in encouraging and teaching us?',
                es: '¿Qué papel juegan las Escrituras en alentarnos y enseñarnos?',
              },
              apply: {
                en: 'Choose one of the Gospels (Matthew, Mark, Luke, or John) and begin reading one chapter per day.',
                es: 'Elige uno de los Evangelios (Mateo, Marcos, Lucas o Juan) y comienza a leer un capítulo por día.',
              },
            },
          ],
        },
        {
          day: 5,
          section: 'grow',
          passages: [
            {
              title: { en: 'Read Regularly', es: 'Lee Regularmente' },
              scripture: { en: '2 Timothy 2:14-15', es: '2 Timoteo 2:14-15' },
              reflect: {
                en: 'According to Paul, what is the responsibility of someone who studies God\'s Word?',
                es: 'Según Pablo, ¿cuál es la responsabilidad de alguien que estudia la Palabra de Dios?',
              },
              apply: {
                en: 'Establish a time and place to read your Bible daily with focus and intention. What time will that be?',
                es: 'Establece un tiempo y un lugar para leer tu Biblia diariamente con enfoque e intención. ¿A qué hora será?',
              },
            },
            {
              title: { en: 'Meditate on God\'s Word', es: 'Medita en la Palabra de Dios' },
              scripture: { en: 'Psalm 1:2', es: 'Salmo 1:2' },
              reflect: {
                en: 'What does it mean to "delight in" and "meditate on" God\'s Word?',
                es: '¿Qué significa "deleitarse" y "meditar" en la Palabra de Dios?',
              },
              apply: {
                en: 'After reading a passage, reflect on one specific verse and ask how you can apply it to your life.',
                es: 'Después de leer un pasaje, reflexiona en un versículo específico y pregúntate cómo puedes aplicarlo a tu vida.',
              },
            },
            {
              title: { en: 'Ask the Holy Spirit for Understanding', es: 'Pide al Espíritu Santo que te Dé Entendimiento' },
              scripture: { en: 'John 14:26', es: 'Juan 14:26' },
              reflect: {
                en: 'What role does the Holy Spirit play in helping us understand Scripture?',
                es: '¿Qué papel juega el Espíritu Santo para ayudarnos a entender las Escrituras?',
              },
              apply: {
                en: 'Begin each reading time with prayer, for example: "Holy Spirit, help me understand and apply what I read."',
                es: 'Comienza cada tiempo de lectura con oración, por ejemplo: "Espíritu Santo, ayúdame a entender y aplicar lo que leo."',
              },
            },
          ],
        },
        {
          day: 6,
          section: 'grow',
          passages: [
            {
              title: { en: 'Obey What You Have Read', es: 'Obedece lo que Has Leído' },
              scripture: { en: 'James 1:22-25', es: 'Santiago 1:22-25' },
              reflect: {
                en: 'What warning and encouragement does James give about the difference between hearing and doing God\'s Word?',
                es: '¿Qué advertencia y aliento da Santiago sobre la diferencia entre oír y hacer la Palabra de Dios?',
              },
              apply: {
                en: 'Based on your reading, write one action step and commit to doing it today.',
                es: 'Basándote en tu lectura, escribe un paso de acción y comprométete a hacerlo hoy.',
              },
            },
            {
              title: { en: 'Remember God\'s Word', es: 'Recuerda la Palabra de Dios' },
              scripture: { en: 'Psalm 119:11', es: 'Salmo 119:11' },
              reflect: {
                en: 'How does memorizing Scripture help us resist sin and grow in holiness?',
                es: '¿Cómo nos ayuda memorizar las Escrituras a resistir el pecado y crecer en santidad?',
              },
              apply: {
                en: 'Choose one verse from your weekly reading to memorize.',
                es: 'Elige un versículo de tu lectura semanal para memorizar.',
              },
            },
          ],
        },
      ],
    },

    // ─── WEEK 3 ───────────────────────────────────────────────────────────────
    {
      number: 3,
      know: { en: 'What is the Trinity?', es: '¿Qué es la Trinidad?' },
      grow: { en: 'How Should I Pray?', es: '¿Cómo Debo Orar?' },
      centralConcept: {
        en: 'The Trinity is how God has revealed Himself in Scripture: one God in three persons—Father, Son, and Holy Spirit. Although the word "Trinity" does not appear in the Bible, its truth is clearly seen throughout Scripture. God is relational and eternal, one in essence and in work.\n\nPrayer is not a religious practice but a powerful relationship with God. It shapes our hearts, aligns our will with His, and transforms our lives when practiced with consistency and sincerity.',
        es: 'La Trinidad es como Dios se ha revelado a sí mismo en las Escrituras: un Dios en tres personas: Padre, Hijo y Espíritu Santo. Aunque la palabra "Trinidad" no aparece en la Biblia, su verdad se ve claramente en toda la Escritura. Dios es relacional y eterno, uno en esencia y en obra.\n\nLa oración no es una práctica religiosa sino una poderosa relación con Dios. Moldea nuestros corazones, alinea nuestra voluntad con la suya y transforma nuestras vidas cuando se practica con consistencia y sinceridad.',
      },
      memoryVerses: {
        en: ['John 1:1-2', 'Matthew 7:7'],
        es: ['Juan 1:1-2', 'Mateo 7:7'],
      },
      actionStep: {
        en: 'Spend time this week praying to the entire Trinity:\n• Thank the Father for His love and purpose,\n• Worship the Son for His grace and salvation,\n• Ask the Spirit for power and guidance.\n\nAllow your love for God to grow and deepen as you come to know Him as three persons in one.',
        es: 'Dedica tiempo esta semana orando a toda la Trinidad:\n• Agradece al Padre por su amor y propósito,\n• Adora al Hijo por su gracia y salvación,\n• Pide al Espíritu poder y guía.\n\nPermite que tu amor por Dios crezca y se profundice a medida que lo conoces como tres personas en uno.',
      },
      growActionStep: {
        en: 'Begin using this four-step prayer model daily (Praise / Repent / Ask / Yield). Start with just five minutes per day and increase the time as you seek God\'s presence.',
        es: 'Comienza a usar este modelo de oración de cuatro pasos diariamente (Alabar / Arrepentirse / Pedir / Rendirse). Comienza con solo cinco minutos por día y aumenta el tiempo a medida que buscas la presencia de Dios.',
      },
      days: [
        {
          day: 1,
          section: 'know',
          passages: [
            {
              title: { en: 'God is Three Persons', es: 'Dios es Tres Personas' },
              scripture: { en: 'Ephesians 4:4-6; 1 Peter 1:2-4', es: 'Efesios 4:4-6; 1 Pedro 1:2-4' },
              reflect: {
                en: 'How do these verses show the distinct roles of the Father, Son, and Spirit within unity?',
                es: '¿Cómo muestran estos versículos los distintos roles del Padre, el Hijo y el Espíritu dentro de la unidad?',
              },
              apply: {
                en: 'Reflect on how you have experienced God as Father, Son, and Spirit in your walk with Him.',
                es: 'Reflexiona en cómo has experimentado a Dios como Padre, Hijo y Espíritu en tu caminar con Él.',
              },
            },
            {
              title: { en: 'One God in Three Persons', es: 'Un Dios en Tres Personas' },
              scripture: { en: 'Acts 10:38', es: 'Hechos 10:38' },
              reflect: {
                en: 'How are all three persons of the Trinity present and active in this verse?',
                es: '¿Cómo están presentes y activas las tres personas de la Trinidad en este versículo?',
              },
              apply: {
                en: 'In your prayers, are you acknowledging the fullness of God as Father, Son, and Holy Spirit?',
                es: '¿En tus oraciones estás reconociendo la plenitud de Dios como Padre, Hijo y Espíritu Santo?',
              },
            },
            {
              title: { en: 'God the Father is Fully God', es: 'Dios el Padre es Completamente Dios' },
              scripture: { en: 'Genesis 1:3; Psalm 115:3', es: 'Génesis 1:3; Salmo 115:3' },
              reflect: {
                en: 'What do these passages reveal about the power and authority of God the Father?',
                es: '¿Qué revelan estos pasajes sobre el poder y la autoridad de Dios el Padre?',
              },
              apply: {
                en: 'How can you trust more deeply in the sovereignty of your heavenly Father?',
                es: '¿Cómo puedes confiar más profundamente en la soberanía de tu Padre celestial?',
              },
            },
          ],
        },
        {
          day: 2,
          section: 'know',
          passages: [
            {
              title: { en: 'The Son is Fully God', es: 'El Hijo es Completamente Dios' },
              scripture: { en: 'John 1:1-4, 6, 12', es: 'Juan 1:1-4, 6, 12' },
              reflect: {
                en: 'How does John describe the divine nature and mission of Jesus?',
                es: '¿Cómo describe Juan la naturaleza divina y la misión de Jesús?',
              },
              apply: {
                en: 'How does it impact your life that Jesus is not merely a teacher, but God Himself?',
                es: '¿Cómo impacta en tu vida el hecho de que Jesús no es simplemente un maestro, sino Dios mismo?',
              },
            },
            {
              title: { en: 'The Holy Spirit is Fully God', es: 'El Espíritu Santo es Completamente Dios' },
              scripture: { en: '1 Corinthians 2:10-16', es: '1 Corintios 2:10-16' },
              reflect: {
                en: 'What role does the Holy Spirit play in revealing God\'s truth?',
                es: '¿Qué papel juega el Espíritu Santo en revelar la verdad de Dios?',
              },
              apply: {
                en: 'Before reading Scripture or making decisions, ask the Spirit to guide and teach you.',
                es: 'Antes de leer las Escrituras o tomar decisiones, pide al Espíritu que te guíe y enseñe.',
              },
            },
            {
              title: { en: 'The Three Are One', es: 'Los Tres Son Uno' },
              scripture: { en: 'Deuteronomy 6:4-9; Mark 12:29-30', es: 'Deuteronomio 6:4-9; Marcos 12:29-30' },
              reflect: {
                en: 'How do these passages affirm both God\'s unity and the command to love Him fully?',
                es: '¿Cómo afirman estos pasajes tanto la unidad de Dios como el mandato de amarlo plenamente?',
              },
              apply: {
                en: 'How are you loving God with all your heart, soul, mind, and strength?',
                es: '¿Cómo estás amando a Dios con todo tu corazón, alma, mente y fuerzas?',
              },
            },
          ],
        },
        {
          day: 3,
          section: 'know',
          passages: [
            {
              title: { en: 'The Trinity Works in Unity', es: 'La Trinidad Obra en Unidad' },
              scripture: { en: 'Matthew 3:16-17', es: 'Mateo 3:16-17' },
              reflect: {
                en: 'What does Jesus\' baptism reveal about the relationship within the Trinity?',
                es: '¿Qué revela el bautismo de Jesús sobre la relación dentro de la Trinidad?',
              },
              apply: {
                en: 'How can this event change how you think about God\'s presence in your spiritual life?',
                es: '¿Cómo puede este evento cambiar tu manera de pensar sobre la presencia de Dios en tu vida espiritual?',
              },
            },
            {
              title: { en: 'The Trinity Participates Together in Salvation', es: 'La Trinidad Participa Juntos en la Salvación' },
              scripture: { en: 'Titus 3:4-7', es: 'Tito 3:4-7' },
              reflect: {
                en: 'How do the Father, Son, and Holy Spirit participate in our salvation and care?',
                es: '¿Cómo participan el Padre, el Hijo y el Espíritu Santo en nuestra salvación y cuidado?',
              },
              apply: {
                en: 'How does knowing the Trinity\'s role in your salvation strengthen your faith and gratitude?',
                es: '¿Cómo fortalece tu fe y gratitud conocer el papel de la Trinidad en tu salvación?',
              },
            },
          ],
        },
        {
          day: 4,
          section: 'grow',
          passages: [
            {
              title: { en: 'Set Apart a Time and Place in Private', es: 'Aparta un Tiempo y un Lugar en Privado' },
              scripture: { en: 'Mark 1:35', es: 'Marcos 1:35' },
              reflect: {
                en: 'What do we learn from Jesus\' example about the priority and setting of prayer?',
                es: '¿Qué aprendemos del ejemplo de Jesús sobre la prioridad y el lugar de la oración?',
              },
              apply: {
                en: 'When and where can you regularly meet with God in prayer without distractions?',
                es: '¿Cuándo y dónde puedes reunirte regularmente con Dios en oración sin distracciones?',
              },
            },
            {
              title: { en: 'Let the Holy Spirit Help You as You Pray', es: 'Deja que el Espíritu Santo te Ayude mientras Oras' },
              scripture: { en: 'Romans 8:26', es: 'Romanos 8:26' },
              reflect: {
                en: 'How does the Holy Spirit help us when we do not know what to pray?',
                es: '¿Cómo nos ayuda el Espíritu Santo cuando no sabemos qué orar?',
              },
              apply: {
                en: 'The next time you feel unsure what to say, pause and ask the Holy Spirit to guide you.',
                es: 'La próxima vez que no sepas qué decir, detente y pide al Espíritu Santo que te guíe.',
              },
            },
          ],
        },
        {
          day: 5,
          section: 'grow',
          passages: [
            {
              title: { en: 'Praise: Honor God for Who He Is', es: 'Alaba: Honra a Dios por Quien Él Es' },
              scripture: { en: 'Psalm 103:1-5', es: 'Salmo 103:1-5' },
              reflect: {
                en: 'What specific attributes and actions of God are we invited to remember and praise?',
                es: '¿Qué atributos y acciones específicas de Dios somos invitados a recordar y alabar?',
              },
              apply: {
                en: 'Pray by recognizing three attributes of God for which you are thankful.',
                es: 'Ora reconociendo tres atributos de Dios por los que estás agradecido.',
              },
            },
            {
              title: { en: 'Repent: Confess and Turn from Sin', es: 'Arrepiéntete: Confiesa y Apártate del Pecado' },
              scripture: { en: '1 John 1:9', es: '1 Juan 1:9' },
              reflect: {
                en: 'What promise does this verse give to those who confess their sins?',
                es: '¿Qué promesa da este versículo a los que confiesan sus pecados?',
              },
              apply: {
                en: 'Honestly confess the sin you need to repent of today.',
                es: 'Confiesa honestamente el pecado del que necesitas arrepentirte hoy.',
              },
            },
          ],
        },
        {
          day: 6,
          section: 'grow',
          passages: [
            {
              title: { en: 'Ask: Tell God Your Needs and Desires', es: 'Pide: Dile a Dios tus Necesidades y Deseos' },
              scripture: { en: 'Philippians 4:6-7', es: 'Filipenses 4:6-7' },
              reflect: {
                en: 'What connection does Paul make between prayer and peace?',
                es: '¿Qué conexión hace Pablo entre la oración y la paz?',
              },
              apply: {
                en: 'What burden or need can you bring to God in prayer today?',
                es: '¿Qué carga o necesidad puedes llevar a Dios en oración hoy?',
              },
            },
            {
              title: { en: 'Yield: Allow the Holy Spirit to Guide Every Area of Your Life', es: 'Ríndete: Permite que el Espíritu Santo Guíe cada Área de tu Vida' },
              scripture: { en: 'Proverbs 3:5-6', es: 'Proverbios 3:5-6' },
              reflect: {
                en: 'What does it mean to submit to God\'s will in daily life?',
                es: '¿Qué significa someterse a la voluntad de Dios en la vida diaria?',
              },
              apply: {
                en: 'Surrender one specific area of your life where you have been holding control.',
                es: 'Entrega un área específica de tu vida en la que has estado manteniendo el control.',
              },
            },
          ],
        },
      ],
    },

    // ─── WEEK 4 ───────────────────────────────────────────────────────────────
    {
      number: 4,
      know: { en: 'What is Sin?', es: '¿Qué es el Pecado?' },
      grow: { en: 'How Do I Evangelize?', es: '¿Cómo Evangelizo?' },
      centralConcept: {
        en: 'Sin is any thought, word, or action that opposes God\'s will and breaks His good design. Sin separates us from God, but Jesus Christ offers victory and cleansing.\n\nEvangelism is sharing the good news of Jesus so that others may know Him and follow Him. Every believer has been called and equipped to be a witness for Christ. God\'s passion for the lost should be our motivation.',
        es: 'El pecado es cualquier pensamiento, palabra o acción que se opone a la voluntad de Dios y rompe su buen diseño. El pecado nos separa de Dios, pero Jesucristo ofrece victoria y limpieza.\n\nEl evangelismo es compartir las buenas noticias de Jesús para que otros puedan conocerlo y seguirlo. Todo creyente ha sido llamado y equipado para ser testigo de Cristo. La pasión de Dios por los perdidos debe ser nuestra motivación.',
      },
      memoryVerses: {
        en: ['Romans 8:1', 'John 14:6'],
        es: ['Romanos 8:1', 'Juan 14:6'],
      },
      actionStep: {
        en: 'Confess your sins honestly to God and receive the freedom Jesus offers. Ask the Holy Spirit for power to live in victory today.',
        es: 'Confiesa tus pecados honestamente a Dios y recibe la libertad que Jesús ofrece. Pide al Espíritu Santo poder para vivir en victoria hoy.',
      },
      growActionStep: {
        en: 'Begin praying today for someone with whom you can share the Gospel. Practice your presentation and stay attentive to the Spirit\'s guidance.',
        es: 'Comienza a orar hoy por alguien con quien puedas compartir el Evangelio. Practica tu presentación y permanece atento a la guía del Espíritu.',
      },
      days: [
        {
          day: 1,
          section: 'know',
          passages: [
            {
              title: { en: 'God Did Not Create Sin', es: 'Dios No Creó el Pecado' },
              scripture: { en: 'James 1:13', es: 'Santiago 1:13' },
              reflect: {
                en: 'What does this verse teach about the origin of sin and God\'s character?',
                es: '¿Qué enseña este versículo sobre el origen del pecado y el carácter de Dios?',
              },
              apply: {
                en: 'How does understanding that God is not the source of sin impact your view of His goodness?',
                es: '¿Cómo impacta en tu visión de la bondad de Dios el entender que Él no es la fuente del pecado?',
              },
            },
            {
              title: { en: 'We Are Born Into Sin', es: 'Nacemos en el Pecado' },
              scripture: { en: 'Romans 3:10-18', es: 'Romanos 3:10-18' },
              reflect: {
                en: 'What does Paul say about the universal nature of sin?',
                es: '¿Qué dice Pablo sobre la naturaleza universal del pecado?',
              },
              apply: {
                en: 'How do you see the effects of sin in your own life and in the world?',
                es: '¿Cómo ves los efectos del pecado en tu propia vida y en el mundo?',
              },
            },
          ],
        },
        {
          day: 2,
          section: 'know',
          passages: [
            {
              title: { en: 'Sin Separates Us from God', es: 'El Pecado Nos Separa de Dios' },
              scripture: { en: 'Isaiah 59:2', es: 'Isaías 59:2' },
              reflect: {
                en: 'What consequence of sin does Isaiah describe?',
                es: '¿Qué consecuencia del pecado describe Isaías?',
              },
              apply: {
                en: 'How is sin affecting your relationship with God right now?',
                es: '¿Cómo está afectando el pecado tu relación con Dios en este momento?',
              },
            },
            {
              title: { en: 'Sin Brings Death', es: 'El Pecado Trae Muerte' },
              scripture: { en: 'Ephesians 2:1-3', es: 'Efesios 2:1-3' },
              reflect: {
                en: 'How does Paul describe the spiritual condition caused by sin?',
                es: '¿Cómo describe Pablo la condición espiritual causada por el pecado?',
              },
              apply: {
                en: 'How has Christ brought you from death to life?',
                es: '¿Cómo te ha llevado Cristo de la muerte a la vida?',
              },
            },
          ],
        },
        {
          day: 3,
          section: 'know',
          passages: [
            {
              title: { en: 'Christ Has Defeated Sin and Its Power', es: 'Cristo Ha Derrotado el Pecado y su Poder' },
              scripture: { en: 'Colossians 2:13-15', es: 'Colosenses 2:13-15' },
              reflect: {
                en: 'How have Christ\'s death and resurrection defeated sin?',
                es: '¿Cómo han derrotado la muerte y resurrección de Cristo al pecado?',
              },
              apply: {
                en: 'In what areas of your life do you need to trust in Christ\'s victory over sin?',
                es: '¿En qué áreas de tu vida necesitas confiar en la victoria de Cristo sobre el pecado?',
              },
            },
            {
              title: { en: 'Jesus Cleanses Us from Sin', es: 'Jesús Nos Limpia del Pecado' },
              scripture: { en: 'Romans 6:10-18', es: 'Romanos 6:10-18' },
              reflect: {
                en: '"Having died to sin, how can we live in it any longer?" What does Paul say about the believer\'s new identity in Christ?',
                es: '"Habiendo muerto al pecado, ¿cómo podemos seguir viviendo en él?" ¿Qué dice Pablo sobre la nueva identidad del creyente en Cristo?',
              },
              apply: {
                en: 'How can you live daily in the freedom from sin that Jesus has provided?',
                es: '¿Cómo puedes vivir diariamente en la libertad del pecado que Jesús ha provisto?',
              },
            },
          ],
        },
        {
          day: 4,
          section: 'grow',
          passages: [
            {
              title: { en: 'We Are All Evangelists', es: 'Todos Somos Evangelistas' },
              scripture: { en: 'Mark 16:15', es: 'Marcos 16:15' },
              reflect: {
                en: 'What is the scope of the Great Commission, and who is called to participate?',
                es: '¿Cuál es el alcance de la Gran Comisión y quién está llamado a participar?',
              },
              apply: {
                en: 'How can you personally embrace your role as an evangelist in everyday life?',
                es: '¿Cómo puedes abrazar personalmente tu papel como evangelista en la vida cotidiana?',
              },
            },
            {
              title: { en: 'God\'s Passion for the Lost is Our Motivation', es: 'La Pasión de Dios por los Perdidos es Nuestra Motivación' },
              scripture: { en: '2 Corinthians 5:14', es: '2 Corintios 5:14' },
              reflect: {
                en: 'How does Christ\'s love compel us to share the Gospel?',
                es: '¿Cómo nos impulsa el amor de Cristo a compartir el Evangelio?',
              },
              apply: {
                en: 'How should God\'s love shape your attitude toward those who do not know Jesus?',
                es: '¿Cómo debe moldear el amor de Dios tu actitud hacia quienes no conocen a Jesús?',
              },
            },
            {
              title: { en: 'Pray for Opportunities', es: 'Ora por Oportunidades' },
              scripture: { en: 'Colossians 4:3', es: 'Colosenses 4:3' },
              reflect: {
                en: 'What role does prayer play in evangelism?',
                es: '¿Qué papel juega la oración en el evangelismo?',
              },
              apply: {
                en: 'Commit to praying consistently for opportunities to share the Gospel.',
                es: 'Comprométete a orar consistentemente por oportunidades para compartir el Evangelio.',
              },
            },
          ],
        },
        {
          day: 5,
          section: 'grow',
          passages: [
            {
              title: { en: 'Practice Sharing the Gospel', es: 'Practica Compartir el Evangelio' },
              scripture: { en: '2 Corinthians 5:18-20', es: '2 Corintios 5:18-20' },
              reflect: {
                en: 'What does it mean to be an ambassador for Christ?',
                es: '¿Qué significa ser un embajador de Cristo?',
              },
              apply: {
                en: 'Prepare and practice a clear way to share the Gospel with someone.',
                es: 'Prepara y practica una manera clara de compartir el Evangelio con alguien.',
              },
            },
            {
              title: { en: 'Be Prepared to Respond with the Gospel', es: 'Prepárate para Responder con el Evangelio' },
              scripture: { en: '1 Peter 3:15', es: '1 Pedro 3:15' },
              reflect: {
                en: 'Why is it important to be ready to explain your faith?',
                es: '¿Por qué es importante estar listo para explicar tu fe?',
              },
              apply: {
                en: 'Structure a simple explanation of the Gospel to share when asked. Visit goodgodgospel.com for additional evangelism resources.',
                es: 'Estructura una explicación sencilla del Evangelio para compartir cuando te pregunten. Visita goodgodgospel.com para recursos adicionales de evangelismo.',
              },
            },
            {
              title: { en: 'Pay Attention to the Spirit\'s Guidance', es: 'Presta Atención a la Guía del Espíritu' },
              scripture: { en: 'John 16:13', es: 'Juan 16:13' },
              reflect: {
                en: 'How does the Holy Spirit guide us in evangelism?',
                es: '¿Cómo nos guía el Espíritu Santo en el evangelismo?',
              },
              apply: {
                en: 'Practice listening to the Spirit\'s guidance in daily conversations.',
                es: 'Practica escuchar la guía del Espíritu en las conversaciones diarias.',
              },
            },
          ],
        },
        {
          day: 6,
          section: 'grow',
          passages: [
            {
              title: { en: 'Do Not Force Anyone', es: 'No Fuerces a Nadie' },
              scripture: { en: '2 Timothy 2:24-26', es: '2 Timoteo 2:24-26' },
              reflect: {
                en: 'What attitude and approach does Paul recommend in evangelism?',
                es: '¿Qué actitud y enfoque recomienda Pablo en el evangelismo?',
              },
              apply: {
                en: 'How can you respect others\' boundaries while still sharing your faith?',
                es: '¿Cómo puedes respetar los límites de otros y aun así compartir tu fe?',
              },
            },
            {
              title: { en: 'Motivated by Urgency', es: 'Motivado por la Urgencia' },
              scripture: { en: 'Luke 19:10', es: 'Lucas 19:10' },
              reflect: {
                en: 'Why is evangelism urgent?',
                es: '¿Por qué es urgente el evangelismo?',
              },
              apply: {
                en: 'How can you develop a heart for the lost and a sense of urgency to share the Gospel?',
                es: '¿Cómo puedes desarrollar un corazón por los perdidos y un sentido de urgencia para compartir el Evangelio?',
              },
            },
            {
              title: { en: 'Empowered to Be His Witness', es: 'Empoderado para Ser Su Testigo' },
              scripture: { en: 'Acts 1:8', es: 'Hechos 1:8' },
              reflect: {
                en: 'What role does the Holy Spirit play in empowering evangelism?',
                es: '¿Qué papel juega el Espíritu Santo para empoderar el evangelismo?',
              },
              apply: {
                en: 'Ask the Spirit for greater boldness to share your faith.',
                es: 'Pide al Espíritu mayor valentía para compartir tu fe.',
              },
            },
          ],
        },
      ],
    },

    // ─── WEEK 5 ───────────────────────────────────────────────────────────────
    {
      number: 5,
      know: { en: 'What is a Biblical Community?', es: '¿Qué es una Comunidad Bíblica?' },
      grow: { en: 'What is My Calling and Purpose?', es: '¿Cuál es Mi Llamado y Propósito?' },
      centralConcept: {
        en: 'Biblical community is more than a social relationship; it is a diverse discipleship partnership empowered by the Spirit and centered on Christ. It is marked by love, commitment, and growth. The early Church models what it means to live together in the way of Jesus.\n\nEvery believer is called to love God and others and has received a spiritual gift from God to build up the body of Christ. Your purpose is discovered, developed, and lived out within a biblical community.',
        es: 'La comunidad bíblica es más que una relación social; es una asociación de discipulado diversa, empoderada por el Espíritu y centrada en Cristo. Se caracteriza por el amor, el compromiso y el crecimiento. La iglesia primitiva modela lo que significa vivir juntos en el camino de Jesús.\n\nTodo creyente está llamado a amar a Dios y a los demás y ha recibido un don espiritual de Dios para edificar el cuerpo de Cristo. Tu propósito se descubre, se desarrolla y se vive dentro de una comunidad bíblica.',
      },
      memoryVerses: {
        en: ['John 13:34', 'Philippians 1:21'],
        es: ['Juan 13:34', 'Filipenses 1:21'],
      },
      actionStep: {
        en: 'Join a biblical community: find a House Church near you and commit to developing Christ-centered relationships.',
        es: 'Únete a una comunidad bíblica: encuentra una Iglesia en Casa cerca de ti y comprométete a desarrollar relaciones centradas en Cristo.',
      },
      growActionStep: {
        en: 'Pray and reflect this week: Where is God calling you to serve? Consider asking a leader or mentor to help you identify your gifts.',
        es: 'Ora y reflexiona esta semana: ¿Dónde te está llamando Dios a servir? Considera pedirle a un líder o mentor que te ayude a identificar tus dones.',
      },
      days: [
        {
          day: 1,
          section: 'know',
          passages: [
            {
              title: { en: 'Founded on Christ', es: 'Fundada en Cristo' },
              scripture: { en: 'Matthew 16:13-21', es: 'Mateo 16:13-21' },
              reflect: {
                en: 'How does Jesus describe the establishment and future of His Church?',
                es: '¿Cómo describe Jesús el establecimiento y el futuro de su Iglesia?',
              },
              apply: {
                en: 'Is Christ the center of your relationships and gatherings? How can this be more evident?',
                es: '¿Es Cristo el centro de tus relaciones y reuniones? ¿Cómo puede esto ser más evidente?',
              },
            },
            {
              title: { en: 'Empowered by the Spirit', es: 'Empoderada por el Espíritu' },
              scripture: { en: 'John 14:16-17', es: 'Juan 14:16-17' },
              reflect: {
                en: 'What role does the Holy Spirit play in uniting and guiding a biblical community?',
                es: '¿Qué papel juega el Espíritu Santo para unir y guiar a una comunidad bíblica?',
              },
              apply: {
                en: 'How do you depend on the Spirit in your relationships within your community?',
                es: '¿Cómo dependes del Espíritu en tus relaciones dentro de tu comunidad?',
              },
            },
            {
              title: { en: 'Multigenerational', es: 'Multigeneracional' },
              scripture: { en: 'Ephesians 2:14', es: 'Efesios 2:14' },
              reflect: {
                en: '"For He Himself is our peace, who made both groups one…" What barriers does Christ break down to unite His people?',
                es: '"Porque Él mismo es nuestra paz, que de los dos hizo uno…" ¿Qué barreras derriba Cristo para unir a su pueblo?',
              },
              apply: {
                en: 'Are you building relationships across generational, cultural, or social boundaries?',
                es: '¿Estás construyendo relaciones a través de fronteras generacionales, culturales o sociales?',
              },
            },
          ],
        },
        {
          day: 2,
          section: 'know',
          passages: [
            {
              title: { en: 'Mutually Devoted', es: 'Mutuamente Dedicados' },
              scripture: { en: 'Romans 12:10', es: 'Romanos 12:10' },
              reflect: {
                en: 'What does genuine mutual devotion and honor look like in biblical community?',
                es: '¿Cómo se ve la devoción mutua genuina y el honor en la comunidad bíblica?',
              },
              apply: {
                en: 'Whom can you intentionally honor or serve this week?',
                es: '¿A quién puedes honrar o servir intencionalmente esta semana?',
              },
            },
            {
              title: { en: 'Compassionate', es: 'Compasiva' },
              scripture: { en: 'Ephesians 4:32', es: 'Efesios 4:32' },
              reflect: {
                en: 'Why are compassion and forgiveness essential for biblical relationships?',
                es: '¿Por qué son esenciales la compasión y el perdón para las relaciones bíblicas?',
              },
              apply: {
                en: 'Is there someone you need to forgive or show kindness to?',
                es: '¿Hay alguien a quien necesitas perdonar o mostrarle bondad?',
              },
            },
          ],
        },
        {
          day: 3,
          section: 'know',
          passages: [
            {
              title: { en: 'Gathers Regularly', es: 'Se Reúne Regularmente' },
              scripture: { en: 'Hebrews 10:23-25', es: 'Hebreos 10:23-25' },
              reflect: {
                en: 'Why is regular gathering vital for the health of the Church?',
                es: '¿Por qué es vital la reunión regular para la salud de la Iglesia?',
              },
              apply: {
                en: 'Do you meet regularly with your spiritual community? What commitment can you make today?',
                es: '¿Te reúnes regularmente con tu comunidad espiritual? ¿Qué compromiso puedes hacer hoy?',
              },
            },
            {
              title: { en: 'Grows', es: 'Crece' },
              scripture: { en: 'Acts 2:42-47', es: 'Hechos 2:42-47' },
              reflect: {
                en: 'What practices helped the early Church grow spiritually and numerically?',
                es: '¿Qué prácticas ayudaron a la iglesia primitiva a crecer espiritualmente y numéricamente?',
              },
              apply: {
                en: 'Which of these—teaching, fellowship, prayer, generosity—can you practice more intentionally?',
                es: '¿Cuál de estas: enseñanza, comunión, oración, generosidad, puedes practicar más intencionalmente?',
              },
            },
          ],
        },
        {
          day: 4,
          section: 'grow',
          passages: [
            {
              title: { en: 'Begin with Your Primary Calling', es: 'Comienza con Tu Llamado Principal' },
              scripture: { en: 'Matthew 22:36-40', es: 'Mateo 22:36-40' },
              reflect: {
                en: 'How does Jesus define the foundation of all calling and purpose?',
                es: '¿Cómo define Jesús el fundamento de todo llamado y propósito?',
              },
              apply: {
                en: 'Are your daily decisions and goals rooted in loving God and others?',
                es: '¿Están tus decisiones y metas diarias arraigadas en amar a Dios y a los demás?',
              },
            },
            {
              title: { en: 'You Have a God-Given Gift', es: 'Tienes un Don Dado por Dios' },
              scripture: { en: '1 Peter 4:10', es: '1 Pedro 4:10' },
              reflect: {
                en: 'What is the purpose of the gifts God gives believers?',
                es: '¿Cuál es el propósito de los dones que Dios da a los creyentes?',
              },
              apply: {
                en: 'What natural talents or spiritual gifts do you believe God has given you to serve others?',
                es: '¿Qué talentos naturales o dones espirituales crees que Dios te ha dado para servir a otros?',
              },
            },
          ],
        },
        {
          day: 5,
          section: 'grow',
          passages: [
            {
              title: { en: 'Your Gift is Discovered and Expressed in Community', es: 'Tu Don se Descubre y Expresa en Comunidad' },
              scripture: { en: 'Ephesians 4:4-7, 11-12', es: 'Efesios 4:4-7, 11-12' },
              reflect: {
                en: 'How are spiritual gifts used and developed within the Church?',
                es: '¿Cómo se usan y desarrollan los dones espirituales dentro de la Iglesia?',
              },
              apply: {
                en: 'Are you actively participating in a biblical community where your gifts can grow?',
                es: '¿Participas activamente en una comunidad bíblica donde tus dones puedan crecer?',
              },
            },
            {
              title: { en: 'Your Gift is Connected to the Church', es: 'Tu Don Está Conectado a la Iglesia' },
              scripture: { en: 'Ephesians 2:10, 18-22', es: 'Efesios 2:10, 18-22' },
              reflect: {
                en: 'What do these verses say about your purpose in God\'s larger plan for the Church?',
                es: '¿Qué dicen estos versículos sobre tu propósito en el plan más amplio de Dios para la Iglesia?',
              },
              apply: {
                en: 'How can you use your gifts to serve and strengthen your local church?',
                es: '¿Cómo puedes usar tus dones para servir y fortalecer a tu iglesia local?',
              },
            },
          ],
        },
        {
          day: 6,
          section: 'grow',
          passages: [
            {
              title: { en: 'Your Gift Can Operate in Many Areas of Ministry', es: 'Tu Don Puede Operar en Muchas Áreas del Ministerio' },
              scripture: { en: 'Romans 12:4-5', es: 'Romanos 12:4-5' },
              reflect: {
                en: 'How does this passage affirm the value of each believer\'s role?',
                es: '¿Cómo afirma este pasaje el valor del papel de cada creyente?',
              },
              apply: {
                en: 'Explore different ministry areas. Where do you feel most useful and passionate?',
                es: 'Explora diferentes áreas del ministerio. ¿Dónde te sientes más útil y apasionado?',
              },
            },
            {
              title: { en: 'Diversity of Gifts Creates Unity', es: 'La Diversidad de Dones Crea Unidad' },
              scripture: { en: '1 Corinthians 12:1-31', es: '1 Corintios 12:1-31' },
              reflect: {
                en: 'How does Paul describe the importance of unity and diversity in the Church?',
                es: '¿Cómo describe Pablo la importancia de la unidad y la diversidad en la Iglesia?',
              },
              apply: {
                en: 'How can you affirm and support the gifts of others, even when they differ from yours?',
                es: '¿Cómo puedes afirmar y apoyar los dones de otros, incluso cuando difieren de los tuyos?',
              },
            },
          ],
        },
      ],
    },

    // ─── WEEK 6 ───────────────────────────────────────────────────────────────
    {
      number: 6,
      know: { en: 'What is Creation?', es: '¿Qué es la Creación?' },
      grow: { en: 'How Do I Give?', es: '¿Cómo Doy?' },
      centralConcept: {
        en: 'God is the uncreated Creator who made all things and gave humanity unique value and purpose as image-bearers. Understanding creation grounds us in God\'s design and mission for life.\n\nGiving is a response to God marked by gratitude, obedience, and faith. Scripture shows how giving directs our hearts toward God\'s Kingdom and frees us from materialism.',
        es: 'Dios es el Creador no creado que hizo todas las cosas y dio a la humanidad un valor y propósito únicos como portadores de su imagen. Comprender la creación nos fundamenta en el diseño y la misión de Dios para la vida.\n\nDar es una respuesta a Dios marcada por la gratitud, la obediencia y la fe. Las Escrituras muestran cómo dar dirige nuestros corazones hacia el Reino de Dios y nos libera del materialismo.',
      },
      memoryVerses: {
        en: ['Colossians 1:15-16', 'Malachi 3:10'],
        es: ['Colosenses 1:15-16', 'Malaquías 3:10'],
      },
      actionStep: {
        en: 'Reflect on how being made in God\'s image defines your identity and purpose. Honor God in how you live, serve, and care for His creation.',
        es: 'Reflexiona en cómo el haber sido creado a imagen de Dios define tu identidad y propósito. Honra a Dios en cómo vives, sirves y cuidas su creación.',
      },
      growActionStep: {
        en: 'Begin giving: pray, plan, and take the first step toward intentional generosity.',
        es: 'Comienza a dar: ora, planifica y da el primer paso hacia una generosidad intencional.',
      },
      days: [
        {
          day: 1,
          section: 'know',
          passages: [
            {
              title: { en: 'God is the Creator of Heaven and Earth', es: 'Dios es el Creador del Cielo y la Tierra' },
              scripture: { en: 'Isaiah 43:10-11; Psalm 33:6', es: 'Isaías 43:10-11; Salmo 33:6' },
              reflect: {
                en: 'How do these verses emphasize God\'s uniqueness and power as Creator?',
                es: '¿Cómo enfatizan estos versículos la singularidad y el poder de Dios como Creador?',
              },
              apply: {
                en: 'How does knowing God is Creator shape your view of life and the world?',
                es: '¿Cómo moldea tu visión de la vida y el mundo el saber que Dios es el Creador?',
              },
            },
            {
              title: { en: 'God Created Everything Good and Beautiful', es: 'Dios Creó Todo Bueno y Hermoso' },
              scripture: { en: 'Colossians 1:15-17', es: 'Colosenses 1:15-17' },
              reflect: {
                en: 'What does Paul teach about Christ\'s role in creation?',
                es: '¿Qué enseña Pablo sobre el papel de Cristo en la creación?',
              },
              apply: {
                en: 'How can you live with purpose knowing all things were created through Christ and for Him?',
                es: '¿Cómo puedes vivir con propósito sabiendo que todas las cosas fueron creadas por Cristo y para Él?',
              },
            },
          ],
        },
        {
          day: 2,
          section: 'know',
          passages: [
            {
              title: { en: 'God Created Man and Woman in His Image', es: 'Dios Creó al Hombre y a la Mujer a Su Imagen' },
              scripture: { en: 'Genesis 1:26-27; 2:7', es: 'Génesis 1:26-27; 2:7' },
              reflect: {
                en: 'What does it mean to be created in God\'s image?',
                es: '¿Qué significa ser creado a imagen de Dios?',
              },
              apply: {
                en: 'How should this truth shape how you view yourself and others?',
                es: '¿Cómo debe esta verdad moldear la manera en que te ves a ti mismo y a los demás?',
              },
            },
            {
              title: { en: 'God Gave Humanity Unique Value and Dignity', es: 'Dios Dio a la Humanidad un Valor y Dignidad Únicos' },
              scripture: { en: 'Psalm 8:3-8', es: 'Salmo 8:3-8' },
              reflect: {
                en: 'What does this passage reveal about human dignity?',
                es: '¿Qué revela este pasaje sobre la dignidad humana?',
              },
              apply: {
                en: 'How does this truth affect how you treat others and yourself?',
                es: '¿Cómo afecta esta verdad la manera en que tratas a los demás y a ti mismo?',
              },
            },
          ],
        },
        {
          day: 3,
          section: 'know',
          passages: [
            {
              title: { en: 'God Gave Humanity a Divine Responsibility', es: 'Dios Dio a la Humanidad una Responsabilidad Divina' },
              scripture: { en: 'Genesis 1:28', es: 'Génesis 1:28' },
              reflect: {
                en: 'What task did God give humanity, and what does this reveal about our role on earth?',
                es: '¿Qué tarea le dio Dios a la humanidad y qué revela esto sobre nuestro papel en la tierra?',
              },
              apply: {
                en: 'How are you caring for God\'s creation and responsibilities?',
                es: '¿Cómo estás cuidando la creación y las responsabilidades de Dios?',
              },
            },
            {
              title: { en: 'We Were Created to Live in God\'s Image', es: 'Fuimos Creados para Vivir a Imagen de Dios' },
              scripture: { en: 'Ephesians 2:1-10', es: 'Efesios 2:1-10' },
              reflect: {
                en: 'How does Paul connect our new life in Christ to God\'s original design?',
                es: '¿Cómo conecta Pablo nuestra nueva vida en Cristo con el diseño original de Dios?',
              },
              apply: {
                en: 'How can you better reflect God\'s character and purpose daily?',
                es: '¿Cómo puedes reflejar mejor el carácter y el propósito de Dios diariamente?',
              },
            },
          ],
        },
        {
          day: 4,
          section: 'grow',
          passages: [
            {
              title: { en: 'God Owns Everything', es: 'Dios lo Posee Todo' },
              scripture: { en: 'Psalm 24:1', es: 'Salmo 24:1' },
              reflect: {
                en: 'What does this verse teach about ownership and stewardship?',
                es: '¿Qué enseña este versículo sobre la propiedad y la mayordomía?',
              },
              apply: {
                en: 'How would your view of money and possessions change if you fully embraced this truth?',
                es: '¿Cómo cambiaría tu visión del dinero y las posesiones si abrazaras plenamente esta verdad?',
              },
            },
            {
              title: { en: 'Giving Frees Us from Greed', es: 'Dar Nos Libera de la Avaricia' },
              scripture: { en: 'Proverbs 11:24-25', es: 'Proverbios 11:24-25' },
              reflect: {
                en: 'How does this proverb contrast selfishness and generosity?',
                es: '¿Cómo contrasta este proverbio el egoísmo y la generosidad?',
              },
              apply: {
                en: 'Where are you tempted to hold back instead of giving freely?',
                es: '¿En qué áreas te tientas a retener en lugar de dar libremente?',
              },
            },
            {
              title: { en: 'Cultivate a Generous Heart', es: 'Cultiva un Corazón Generoso' },
              scripture: { en: 'Matthew 6:19-21, 33', es: 'Mateo 6:19-21, 33' },
              reflect: {
                en: 'What connection does Jesus make between treasure, heart, and priorities?',
                es: '¿Qué conexión hace Jesús entre el tesoro, el corazón y las prioridades?',
              },
              apply: {
                en: 'What would change if God\'s Kingdom became your financial priority?',
                es: '¿Qué cambiaría si el Reino de Dios se convirtiera en tu prioridad financiera?',
              },
            },
          ],
        },
        {
          day: 5,
          section: 'grow',
          passages: [
            {
              title: { en: 'Give Intentionally', es: 'Da Intencionalmente' },
              scripture: { en: 'Proverbs 3:9-10', es: 'Proverbios 3:9-10' },
              reflect: {
                en: 'What does it mean to honor God with the "firstfruits"?',
                es: '¿Qué significa honrar a Dios con las "primicias"?',
              },
              apply: {
                en: 'What would it look like to give God first place in your budget?',
                es: '¿Cómo se vería darle a Dios el primer lugar en tu presupuesto?',
              },
            },
            {
              title: { en: 'Give Regularly', es: 'Da Regularmente' },
              scripture: { en: '1 Corinthians 16:2', es: '1 Corintios 16:2' },
              reflect: {
                en: 'What principles does Paul give regarding giving in the Church?',
                es: '¿Qué principios da Pablo con respecto al dar en la Iglesia?',
              },
              apply: {
                en: 'Do you give regularly? If not, what step can you take?',
                es: '¿Das regularmente? Si no, ¿qué paso puedes dar?',
              },
            },
            {
              title: { en: 'Give Generously', es: 'Da Generosamente' },
              scripture: { en: '2 Corinthians 9:6-7', es: '2 Corintios 9:6-7' },
              reflect: {
                en: 'What is the relationship between attitude and giving?',
                es: '¿Cuál es la relación entre la actitud y el dar?',
              },
              apply: {
                en: 'Do you give joyfully or out of obligation? Why?',
                es: '¿Das con alegría o por obligación? ¿Por qué?',
              },
            },
          ],
        },
        {
          day: 6,
          section: 'grow',
          passages: [
            {
              title: { en: 'Give Proportionally', es: 'Da Proporcionalmente' },
              scripture: { en: 'Luke 6:38', es: 'Lucas 6:38' },
              reflect: {
                en: 'How does Jesus use imagery to teach proportional generosity?',
                es: '¿Cómo usa Jesús imágenes para enseñar la generosidad proporcional?',
              },
              apply: {
                en: 'Does your giving reflect what God has entrusted to you?',
                es: '¿Refleja tu dar lo que Dios te ha confiado?',
              },
            },
            {
              title: { en: 'Give Sacrificially', es: 'Da Sacrificialmente' },
              scripture: { en: 'Mark 12:41-44', es: 'Marcos 12:41-44' },
              reflect: {
                en: 'Why was the widow\'s offering significant to Jesus?',
                es: '¿Por qué fue significativa la ofrenda de la viuda para Jesús?',
              },
              apply: {
                en: 'When was the last time giving truly cost you something?',
                es: '¿Cuándo fue la última vez que dar realmente te costó algo?',
              },
            },
            {
              title: { en: 'Give to the Local Church Body', es: 'Da al Cuerpo de la Iglesia Local' },
              scripture: { en: 'Acts 2:44-45', es: 'Hechos 2:44-45' },
              reflect: {
                en: 'What does this passage reveal about the early Church\'s view of possessions?',
                es: '¿Qué revela este pasaje sobre la visión de la iglesia primitiva sobre las posesiones?',
              },
              apply: {
                en: 'How could your giving meet the needs of your church?',
                es: '¿Cómo podría tu dar satisfacer las necesidades de tu iglesia?',
              },
            },
          ],
        },
      ],
    },

    // ─── WEEK 7 ───────────────────────────────────────────────────────────────
    {
      number: 7,
      know: { en: 'What is the Return of Christ?', es: '¿Qué es el Regreso de Cristo?' },
      grow: { en: 'How Do I Make Disciples?', es: '¿Cómo Hago Discípulos?' },
      centralConcept: {
        en: 'Jesus will one day return to fully reign over heaven and earth. Though the timing is unknown, believers live with hope, alertness, and eternity in mind.\n\nOne-on-one discipleship is when one follower of Christ helps another follow Christ more closely. It is not a program, but a lifestyle of obedience lived in community in response to Jesus\' command to make disciples.',
        es: 'Jesús regresará un día para reinar plenamente sobre el cielo y la tierra. Aunque el momento es desconocido, los creyentes viven con esperanza, vigilancia y la eternidad en mente.\n\nEl discipulado uno a uno es cuando un seguidor de Cristo ayuda a otro a seguir a Cristo más de cerca. No es un programa, sino un estilo de vida de obediencia vivido en comunidad en respuesta al mandato de Jesús de hacer discípulos.',
      },
      memoryVerses: {
        en: ['Philippians 3:10', 'Luke 9:23-24'],
        es: ['Filipenses 3:10', 'Lucas 9:23-24'],
      },
      actionStep: {
        en: 'Live with hope and alertness, share the good news of Jesus\' return, and cultivate a heart ready to meet Him.',
        es: 'Vive con esperanza y vigilancia, comparte las buenas noticias del regreso de Jesús y cultiva un corazón listo para encontrarte con Él.',
      },
      growActionStep: {
        en: 'Commit to walking alongside someone to grow closer to Jesus. If you need more help, enroll in Discipleship Training 1:1 to learn how to disciple and use this same resource with others.',
        es: 'Comprométete a caminar junto a alguien para crecer más cerca de Jesús. Si necesitas más ayuda, inscríbete en el Entrenamiento de Discipulado 1:1 para aprender a discipular y usar este mismo recurso con otros.',
      },
      days: [
        {
          day: 1,
          section: 'know',
          passages: [
            {
              title: { en: 'Jesus Will Return', es: 'Jesús Regresará' },
              scripture: { en: '1 Thessalonians 4:16-17', es: '1 Tesalonicenses 4:16-17' },
              reflect: {
                en: 'What does this passage describe about Jesus\' return?',
                es: '¿Qué describe este pasaje sobre el regreso de Jesús?',
              },
              apply: {
                en: 'How does this promise impact your daily life and hope?',
                es: '¿Cómo impacta esta promesa en tu vida diaria y tu esperanza?',
              },
            },
            {
              title: { en: 'No One Knows When Jesus Will Return', es: 'Nadie Sabe Cuándo Regresará Jesús' },
              scripture: { en: 'Matthew 24:36-39', es: 'Mateo 24:36-39' },
              reflect: {
                en: 'What warning does Jesus give about readiness?',
                es: '¿Qué advertencia da Jesús sobre estar preparados?',
              },
              apply: {
                en: 'How can you live prepared and watchful each day?',
                es: '¿Cómo puedes vivir preparado y vigilante cada día?',
              },
            },
            {
              title: { en: 'There Will Be Judgment', es: 'Habrá Juicio' },
              scripture: { en: 'Acts 17:30-31', es: 'Hechos 17:30-31' },
              reflect: {
                en: 'Why is the coming judgment important?',
                es: '¿Por qué es importante el juicio venidero?',
              },
              apply: {
                en: 'How does this reality affect how you live and share your faith?',
                es: '¿Cómo afecta esta realidad la manera en que vives y compartes tu fe?',
              },
            },
          ],
        },
        {
          day: 2,
          section: 'know',
          passages: [
            {
              title: { en: 'Believers Can Have Peace Regarding Christ\'s Return', es: 'Los Creyentes Pueden Tener Paz Respecto al Regreso de Cristo' },
              scripture: { en: '1 Thessalonians 5:9', es: '1 Tesalonicenses 5:9' },
              reflect: {
                en: 'What assurance does Paul give believers?',
                es: '¿Qué seguridad da Pablo a los creyentes?',
              },
              apply: {
                en: 'How can you live without fear and rest in God\'s salvation?',
                es: '¿Cómo puedes vivir sin temor y descansar en la salvación de Dios?',
              },
            },
            {
              title: { en: 'Stay Alert for His Return', es: 'Mantente Alerta para Su Regreso' },
              scripture: { en: 'Mark 13:33', es: 'Marcos 13:33' },
              reflect: {
                en: 'Why does Jesus emphasize watchfulness?',
                es: '¿Por qué enfatiza Jesús la vigilancia?',
              },
              apply: {
                en: 'What spiritual disciplines help keep you alert?',
                es: '¿Qué disciplinas espirituales te ayudan a mantenerte alerta?',
              },
            },
          ],
        },
        {
          day: 3,
          section: 'know',
          passages: [
            {
              title: { en: 'Live Today with Eternity in Mind', es: 'Vive Hoy con la Eternidad en Mente' },
              scripture: { en: 'Matthew 6:19-21; Titus 2:11-14', es: 'Mateo 6:19-21; Tito 2:11-14' },
              reflect: {
                en: 'How should eternity shape your priorities?',
                es: '¿Cómo debe la eternidad moldear tus prioridades?',
              },
              apply: {
                en: 'What changes can you make to focus on eternal values?',
                es: '¿Qué cambios puedes hacer para enfocarte en los valores eternos?',
              },
            },
            {
              title: { en: 'Jesus Has the Final Word', es: 'Jesús Tiene la Última Palabra' },
              scripture: { en: 'Philippians 2:9-11', es: 'Filipenses 2:9-11' },
              reflect: {
                en: 'How does this passage highlight Christ\'s authority?',
                es: '¿Cómo destaca este pasaje la autoridad de Cristo?',
              },
              apply: {
                en: 'How does this truth motivate worship and faithful witness?',
                es: '¿Cómo motiva esta verdad la adoración y el testimonio fiel?',
              },
            },
          ],
        },
        {
          day: 4,
          section: 'grow',
          passages: [
            {
              title: { en: 'Jesus Calls Us to Make Disciples', es: 'Jesús Nos Llama a Hacer Discípulos' },
              scripture: { en: 'Matthew 28:19', es: 'Mateo 28:19' },
              reflect: {
                en: 'What is the main command Jesus gives, and how should it shape your priorities?',
                es: '¿Cuál es el mandato principal que da Jesús y cómo debe moldear tus prioridades?',
              },
              apply: {
                en: 'Who might God be calling you to invite into discipleship?',
                es: '¿A quién podría estar llamándote Dios a invitar al discipulado?',
              },
            },
            {
              title: { en: 'Invite Someone and Meet Regularly', es: 'Invita a Alguien y Reúnanse Regularmente' },
              scripture: { en: 'Hebrews 10:25', es: 'Hebreos 10:25' },
              reflect: {
                en: 'Why is consistent meeting essential for growth?',
                es: '¿Por qué es esencial la reunión consistente para el crecimiento?',
              },
              apply: {
                en: 'Set a regular time and place to meet for discipleship.',
                es: 'Establece un tiempo y un lugar regulares para reunirse para el discipulado.',
              },
            },
          ],
        },
        {
          day: 5,
          section: 'grow',
          passages: [
            {
              title: { en: 'Identify an Area Where Obedience is Needed', es: 'Identifica un Área Donde se Necesita Obediencia' },
              scripture: { en: 'Luke 9:23-24', es: 'Lucas 9:23-24' },
              reflect: {
                en: 'What does Jesus require of those who follow Him?',
                es: '¿Qué requiere Jesús de los que le siguen?',
              },
              apply: {
                en: 'What area of life is hardest to surrender to Christ right now? Be honest together.',
                es: '¿Qué área de la vida es más difícil de entregar a Cristo en este momento? Sean honestos juntos.',
              },
            },
            {
              title: { en: 'Find a Related Scripture Passage', es: 'Encuentra un Pasaje de la Escritura Relacionado' },
              scripture: { en: '1 Peter 4:14-16', es: '1 Pedro 4:14-16' },
              reflect: {
                en: '"…let him glorify God…" How does this passage encourage believers in difficult situations?',
                es: '"…glorifique a Dios…" ¿Cómo alienta este pasaje a los creyentes en situaciones difíciles?',
              },
              apply: {
                en: 'Read a passage together related to the area you identified. Write down key insights.',
                es: 'Lee juntos un pasaje relacionado con el área que identificaste. Escribe los puntos clave.',
              },
            },
          ],
        },
        {
          day: 6,
          section: 'grow',
          passages: [
            {
              title: { en: 'Make a Personal Plan to Grow in Obedience', es: 'Haz un Plan Personal para Crecer en Obediencia' },
              scripture: { en: 'Matthew 16:24-26', es: 'Mateo 16:24-26' },
              reflect: {
                en: 'How does Jesus connect discipleship with sacrifice and eternal perspective?',
                es: '¿Cómo conecta Jesús el discipulado con el sacrificio y la perspectiva eterna?',
              },
              apply: {
                en: 'Each person write a clear action step based on what God is teaching you and follow up.',
                es: 'Que cada persona escriba un paso de acción claro basado en lo que Dios te está enseñando y dale seguimiento.',
              },
            },
            {
              title: { en: 'Disciple Your Partner Until They Can Disciple Others', es: 'Discipula a Tu Compañero Hasta que Pueda Discipular a Otros' },
              scripture: { en: 'Luke 10:1-4', es: 'Lucas 10:1-4' },
              reflect: {
                en: 'What does Jesus sending others reveal about multiplying discipleship?',
                es: '¿Qué revela el envío de Jesús a otros sobre la multiplicación del discipulado?',
              },
              apply: {
                en: 'Encourage the person you are discipling to pray now for someone they can disciple next.',
                es: 'Anima a la persona que estás discipulando a orar ahora por alguien a quien puedan discipular a continuación.',
              },
            },
          ],
        },
      ],
    },

  ],
};
