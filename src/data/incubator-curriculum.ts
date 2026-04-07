// Incubator curriculum data — extracted from preview.html
// Type definitions and data export for Pastor Incubator module

export interface BilingualString {
  en: string;
  es: string;
}

export interface IncubatorModule {
  title: BilingualString;
  scripture: BilingualString;
  keyVerses: BilingualString[];
  selfEval: BilingualString[];
}

export interface IncubatorDay {
  day: number;
  modules: IncubatorModule[];
}

export interface IncubatorWeek {
  number: number;
  title: BilingualString;
  section: 'character' | 'doctrine' | 'convictions';
  days: IncubatorDay[];
}

export interface IncubatorCurriculum {
  weeks: IncubatorWeek[];
}

export const loc = (obj: BilingualString | BilingualString[], lang: string): string | string[] => {
  if (Array.isArray(obj)) return obj.map((item) => item[lang as keyof BilingualString] || item.en);
  return obj[lang as keyof BilingualString] || obj.en;
};

export const INCUBATOR_CURRICULUM: IncubatorCurriculum = {
  weeks: [
    // ===== WEEK 1: CHARACTER — Inner Life & Personal Integrity (4 days) =====
    {
      number: 1,
      title: { en: "Inner Life & Personal Integrity", es: "Vida Interior e Integridad Personal" },
      section: "character",
      days: [
        {
          day: 1,
          modules: [{
            title: { en: "Blameless", es: "Irreprensible" },
            scripture: { en: "1 Timothy 3:2", es: "1 Timoteo 3:2" },
            keyVerses: [
              { en: "Titus 1:6-7", es: "Tito 1:6-7" },
              { en: "Matthew 5:14-16", es: "Mateo 5:14-16" },
              { en: "1 Peter 2:12", es: "1 Pedro 2:12" },
              { en: "Proverbs 11:3", es: "Proverbios 11:3" },
              { en: "1 Timothy 4:12", es: "1 Timoteo 4:12" },
              { en: "Hebrews 13:7", es: "Hebreos 13:7" },
              { en: "Psalm 119:11", es: "Salmo 119:11" },
              { en: "Proverbs 27:17", es: "Proverbios 27:17" },
              { en: "1 Corinthians 10:13", es: "1 Corintios 10:13" },
              { en: "Galatians 5:16", es: "Gálatas 5:16" }
            ],
            selfEval: [
              { en: "In what areas of my life do I struggle most to maintain integrity? How can I work on these areas?", es: "¿En qué áreas de mi vida lucho más por mantenerme íntegro? ¿Cómo puedo trabajar en estas áreas?" },
              { en: "Is there a continuous pattern of sin in my life that could damage my testimony as a Christian?", es: "¿Hay algún patrón continuo de pecado en mi vida que podría dañar mi testimonio como cristiano?" },
              { en: "Do my private actions match my public persona? Am I the same person in secret as I am in public?", es: "¿Mis acciones privadas coinciden con mi persona pública? ¿Soy la misma persona en secreto que en público?" }
            ]
          }]
        },
        {
          day: 2,
          modules: [{
            title: { en: "Not Given to Wine", es: "No Dado al Vino" },
            scripture: { en: "1 Timothy 3:3", es: "1 Timoteo 3:3" },
            keyVerses: [
              { en: "Ephesians 5:18", es: "Efesios 5:18" },
              { en: "Proverbs 20:1", es: "Proverbios 20:1" },
              { en: "Proverbs 23:29-35", es: "Proverbios 23:29-35" },
              { en: "1 Peter 5:8", es: "1 Pedro 5:8" },
              { en: "Titus 1:7-8", es: "Tito 1:7-8" },
              { en: "1 Timothy 4:12", es: "1 Timoteo 4:12" },
              { en: "Romans 13:13-14", es: "Romanos 13:13-14" },
              { en: "1 Corinthians 10:31", es: "1 Corintios 10:31" },
              { en: "James 5:16", es: "Santiago 5:16" }
            ],
            selfEval: [
              { en: "Do I exercise self-control in my life, making sure no substance or habit — including alcohol — has power over my actions, judgment, or testimony?", es: "¿Ejerzo dominio propio en mi vida, asegurándome de que ninguna sustancia o hábito — incluyendo el alcohol — tenga poder sobre mis acciones, juicio o testimonio?" },
              { en: "Am I being an example of godly living, making decisions that honor God and encourage others to walk in holiness?", es: "¿Estoy siendo ejemplo de vida piadosa, tomando decisiones que honren a Dios y animen a otros a caminar en santidad?" },
              { en: "Do I depend on the Holy Spirit for strength and satisfaction instead of turning to worldly substances or behaviors for comfort or escape?", es: "¿Dependo del Espíritu Santo para fortaleza y satisfacción en lugar de recurrir a sustancias o comportamientos mundanos para consuelo o escape?" }
            ]
          }]
        },
        {
          day: 3,
          modules: [{
            title: { en: "Not Quarrelsome, but Gentle", es: "No Pendenciero, sino Amable" },
            scripture: { en: "1 Timothy 3:3", es: "1 Timoteo 3:3" },
            keyVerses: [
              { en: "Titus 1:7", es: "Tito 1:7" },
              { en: "Matthew 11:29", es: "Mateo 11:29" },
              { en: "Proverbs 15:1", es: "Proverbios 15:1" },
              { en: "2 Timothy 2:24-25", es: "2 Timoteo 2:24-25" },
              { en: "James 1:19-20", es: "Santiago 1:19-20" },
              { en: "Ephesians 4:29", es: "Efesios 4:29" },
              { en: "Matthew 5:9", es: "Mateo 5:9" },
              { en: "Galatians 5:22-23", es: "Gálatas 5:22-23" }
            ],
            selfEval: [
              { en: "Do I respond to conflict and difficult situations with patience and gentleness, or do I react with anger and harshness?", es: "¿Respondo al conflicto y a las situaciones difíciles con paciencia y mansedumbre, o reacciono con ira y dureza?" },
              { en: "Do my words and actions build up others in love, or do they create division, fear, or discouragement?", es: "¿Mis palabras y acciones edifican a otros en amor, o crean división, temor o desaliento?" },
              { en: "Am I depending on the Holy Spirit to develop a gentle and controlled spirit in my daily interactions?", es: "¿Estoy dependiendo del Espíritu Santo para desarrollar un espíritu manso y controlado en mis interacciones diarias?" }
            ]
          }]
        },
        {
          day: 4,
          modules: [{
            title: { en: "Not Contentious", es: "No Contencioso" },
            scripture: { en: "1 Timothy 3:3", es: "1 Timoteo 3:3" },
            keyVerses: [
              { en: "Proverbs 20:3", es: "Proverbios 20:3" },
              { en: "2 Timothy 2:23-24", es: "2 Timoteo 2:23-24" },
              { en: "Proverbs 26:21", es: "Proverbios 26:21" },
              { en: "Matthew 5:9", es: "Mateo 5:9" },
              { en: "Titus 3:9", es: "Tito 3:9" },
              { en: "James 1:19-20", es: "Santiago 1:19-20" },
              { en: "Proverbs 17:14", es: "Proverbios 17:14" },
              { en: "Ephesians 4:29", es: "Efesios 4:29" },
              { en: "Galatians 5:22-23", es: "Gálatas 5:22-23" }
            ],
            selfEval: [
              { en: "Do I seek to promote peace and unity in my relationships, or do I find myself easily drawn to arguments and conflicts?", es: "¿Busco promover la paz y la unidad en mis relaciones, o me encuentro fácilmente atraído a las discusiones y los conflictos?" },
              { en: "Do my words and actions build up others in wisdom and kindness, or am I provoking unnecessary disputes?", es: "¿Mis palabras y acciones edifican a otros en sabiduría y bondad, o estoy provocando disputas innecesarias?" },
              { en: "Am I depending on the Holy Spirit to develop patience and self-control in how I respond to disagreements?", es: "¿Estoy dependiendo del Espíritu Santo para desarrollar paciencia y dominio propio en cómo respondo a los desacuerdos?" }
            ]
          }]
        }
      ]
    },
    // ===== WEEK 2: CHARACTER — Leadership & Relational Maturity (4 days) =====
    {
      number: 2,
      title: { en: "Leadership & Relational Maturity", es: "Liderazgo y Madurez Relacional" },
      section: "character",
      days: [
        {
          day: 1,
          modules: [{
            title: { en: "Faithful", es: "Fiel" },
            scripture: { en: "1 Timothy 3:2", es: "1 Timoteo 3:2" },
            keyVerses: [
              { en: "Genesis 2:24", es: "Génesis 2:24" },
              { en: "Ephesians 5:25", es: "Efesios 5:25" },
              { en: "1 Peter 5:3", es: "1 Pedro 5:3" },
              { en: "Titus 1:6", es: "Tito 1:6" },
              { en: "Romans 7:2-3", es: "Romanos 7:2-3" },
              { en: "Matthew 19:9", es: "Mateo 19:9" }
            ],
            selfEval: [
              { en: "Do I demonstrate faithfulness and devotion in my marriage, both in actions and in my heart, as a reflection of Christ's love for the Church?", es: "¿Demuestro fidelidad y devoción en mi matrimonio, tanto en acciones como en mi corazón, como reflejo del amor de Cristo por la Iglesia?" },
              { en: "Do I maintain God's standard for moral purity in my relationships, avoiding any form of temptation or compromise that could damage my integrity?", es: "¿Mantengo el estándar de Dios para la pureza moral en mis relaciones, y evito cualquier forma de tentación o compromiso que pueda dañar mi integridad?" },
              { en: "As a leader (or future leader), am I setting an example of faithfulness that others in the Church can follow, both in my family life and in my spiritual walk?", es: "Como líder (o futuro líder), ¿estoy dando un ejemplo de fidelidad que otros en la Iglesia puedan seguir, tanto en mi vida familiar como en mi caminar espiritual?" }
            ]
          }]
        },
        {
          day: 2,
          modules: [{
            title: { en: "Hospitable", es: "Hospitalario" },
            scripture: { en: "1 Timothy 3:2", es: "1 Timoteo 3:2" },
            keyVerses: [
              { en: "Romans 12:13", es: "Romanos 12:13" },
              { en: "Hebrews 13:2", es: "Hebreos 13:2" },
              { en: "1 Peter 4:9", es: "1 Pedro 4:9" },
              { en: "Psalm 68:5-6", es: "Salmos 68:5-6" },
              { en: "John 14:2", es: "Juan 14:2" },
              { en: "Acts 2:46-47", es: "Hechos 2:46-47" },
              { en: "Acts 16:15", es: "Hechos 16:15" },
              { en: "Matthew 25:35", es: "Mateo 25:35" }
            ],
            selfEval: [
              { en: "Do I intentionally create a welcoming and open-hearted environment for others, especially those in need or outside my close circle?", es: "¿Intencionalmente creo un ambiente acogedor y de corazón abierto para otros, especialmente aquellos en necesidad o fuera de mi círculo cercano?" },
              { en: "How do I use my home, time, and resources to serve and encourage others in a way that reflects God's love?", es: "¿Cómo uso mi hogar, tiempo y recursos para servir y alentar a otros de una manera que refleje el amor de Dios?" },
              { en: "How can I improve in hospitality, both within my church community and with those who do not yet know Christ?", es: "¿Cómo puedo mejorar en hospitalidad, tanto con mi comunidad de iglesia como con quienes todavía no conocen a Cristo?" }
            ]
          }]
        },
        {
          day: 3,
          modules: [{
            title: { en: "Managing His Household Well", es: "Que Gobierne Bien su Casa" },
            scripture: { en: "1 Timothy 3:4-5", es: "1 Timoteo 3:4-5" },
            keyVerses: [
              { en: "Ephesians 5:25", es: "Efesios 5:25" },
              { en: "Ephesians 5:23", es: "Efesios 5:23" },
              { en: "Proverbs 22:6", es: "Proverbios 22:6" },
              { en: "1 Timothy 5:8", es: "1 Timoteo 5:8" },
              { en: "Colossians 3:20-21", es: "Colosenses 3:20-21" },
              { en: "Titus 1:6", es: "Tito 1:6" },
              { en: "Deuteronomy 6:6-7", es: "Deuteronomio 6:6-7" },
              { en: "Proverbs 13:24", es: "Proverbios 13:24" }
            ],
            selfEval: [
              { en: "Do I lead my family with love, wisdom, and godly principles, or do I neglect my responsibilities at home?", es: "¿Lidero a mi familia con amor, sabiduría y principios piadosos, o descuido mis responsabilidades en casa?" },
              { en: "Am I actively discipling my family by teaching God's Word and setting an example of faith and integrity?", es: "¿Discipulo activamente a mi familia enseñando la Palabra de Dios y dando ejemplo de fe e integridad?" },
              { en: "Do I provide for and protect my family in the spiritual, emotional, and physical aspects in a way that honors God?", es: "¿Proveo y protejo a mi familia en el aspecto espiritual, emocional y físico de una manera que honre a Dios?" }
            ]
          }]
        },
        {
          day: 4,
          modules: [{
            title: { en: "Good Testimony from Outsiders", es: "Buen Testimonio de los de Afuera" },
            scripture: { en: "1 Timothy 3:7", es: "1 Timoteo 3:7" },
            keyVerses: [
              { en: "Proverbs 22:1", es: "Proverbios 22:1" },
              { en: "Colossians 3:23-24", es: "Colosenses 3:23-24" },
              { en: "Matthew 5:16", es: "Mateo 5:16" },
              { en: "2 Corinthians 6:3", es: "2 Corintios 6:3" },
              { en: "Colossians 3:17", es: "Colosenses 3:17" },
              { en: "Romans 12:18", es: "Romanos 12:18" },
              { en: "Philippians 2:15", es: "Filipenses 2:15" },
              { en: "Titus 2:7-8", es: "Tito 2:7-8" }
            ],
            selfEval: [
              { en: "Do I live with integrity in all areas of my life and make sure my actions are consistent with my words and my faith?", es: "¿Vivo con integridad en todas las áreas de mi vida y me aseguro de que mis acciones sean congruentes con mis palabras y mi fe?" },
              { en: "Do I actively seek peace with others and work to avoid conflicts by showing kindness and justice in my relationships?", es: "¿Busco activamente la paz con otros y trabajo para evitar conflictos mostrando bondad y justicia en mis relaciones?" },
              { en: "How do I make sure my testimony reflects the love and truth of Christ, both within the Church and in the broader community?", es: "¿Cómo me aseguro de que mi testimonio refleje el amor y la verdad de Cristo, tanto dentro de la Iglesia como en la comunidad en general?" }
            ]
          }]
        }
      ]
    },
    // ===== WEEK 3: CHARACTER — Spiritual Maturity (5 days) =====
    {
      number: 3,
      title: { en: "Spiritual Maturity", es: "Madurez Espiritual" },
      section: "character",
      days: [
        {
          day: 1,
          modules: [{
            title: { en: "Prudent / Self-Controlled", es: "Prudente" },
            scripture: { en: "1 Timothy 3:2", es: "1 Timoteo 3:2" },
            keyVerses: [
              { en: "Galatians 5:22-23", es: "Gálatas 5:22-23" },
              { en: "Proverbs 25:28", es: "Proverbios 25:28" },
              { en: "1 Corinthians 9:27", es: "1 Corintios 9:27" },
              { en: "James 1:19-20", es: "Santiago 1:19-20" },
              { en: "Titus 1:8", es: "Tito 1:8" },
              { en: "2 Corinthians 10:5", es: "2 Corintios 10:5" },
              { en: "Proverbs 16:32", es: "Proverbios 16:32" },
              { en: "Romans 13:14", es: "Romanos 13:14" }
            ],
            selfEval: [
              { en: "Am I prudent in my thoughts, emotions, and desires, making sure they align with God's will and reflect spiritual maturity?", es: "¿Soy prudente en mis pensamientos, emociones y deseos, y me aseguro de que se alineen con la voluntad de Dios y reflejen madurez espiritual?" },
              { en: "Am I careful with my words and reactions when responding to challenges with patience and wisdom instead of anger or impulsivity?", es: "¿Soy cuidadoso con mis palabras y reacciones al responder a los desafíos con paciencia y sabiduría en lugar de ira o impulsividad?" },
              { en: "In what areas of my life (finances, time management, relationships, words, diet, etc.) do I need to grow in prudence, and how can I depend on the Holy Spirit to be strengthened in this area?", es: "¿En qué áreas de mi vida (finanzas, manejo del tiempo, relaciones, palabras, alimentación, etc.) necesito crecer en prudencia, y cómo puedo depender del Espíritu Santo para ser fortalecido en esta área?" }
            ]
          }]
        },
        {
          day: 2,
          modules: [{
            title: { en: "Respectable Conduct", es: "De Conducta Decorosa" },
            scripture: { en: "1 Timothy 3:2", es: "1 Timoteo 3:2" },
            keyVerses: [
              { en: "2 Corinthians 6:3", es: "2 Corintios 6:3" },
              { en: "Proverbs 22:1", es: "Proverbios 22:1" },
              { en: "1 Peter 5:2-3", es: "1 Pedro 5:2-3" },
              { en: "Titus 2:7-8", es: "Tito 2:7-8" },
              { en: "Philippians 2:3", es: "Filipenses 2:3" },
              { en: "Colossians 3:12", es: "Colosenses 3:12" },
              { en: "Psalm 119:9", es: "Salmo 119:9" },
              { en: "Luke 16:10", es: "Lucas 16:10" },
              { en: "Romans 12:10", es: "Romanos 12:10" }
            ],
            selfEval: [
              { en: "Does my lifestyle reflect integrity, humility, and self-discipline in a way that earns the respect of others and honors Christ?", es: "¿Mi estilo de vida refleja integridad, humildad y autodisciplina de una manera que se gana el respeto de otros y honra a Cristo?" },
              { en: "Am I reliable and consistent in my words and actions, making sure they do not bring shame or controversy?", es: "¿Soy confiable y consistente en mis palabras y acciones, asegurándome de que no traigan vergüenza o controversia?" },
              { en: "Do I treat others with honor, respect, and compassion, reflecting Christ in all my relationships?", es: "¿Trato a otros con honor, respeto y compasión, reflejando a Cristo en todas mis relaciones?" }
            ]
          }]
        },
        {
          day: 3,
          modules: [{
            title: { en: "Able to Teach", es: "Apto para Enseñar" },
            scripture: { en: "1 Timothy 3:2", es: "1 Timoteo 3:2" },
            keyVerses: [
              { en: "2 Timothy 2:24-25", es: "2 Timoteo 2:24-25" },
              { en: "Ephesians 4:11-12", es: "Efesios 4:11-12" },
              { en: "1 Timothy 4:16", es: "1 Timoteo 4:16" },
              { en: "2 Timothy 3:16-17", es: "2 Timoteo 3:16-17" },
              { en: "Psalm 119:11", es: "Salmo 119:11" },
              { en: "John 14:26", es: "Juan 14:26" },
              { en: "Matthew 28:19-20", es: "Mateo 28:19-20" },
              { en: "Titus 2:7", es: "Tito 2:7" }
            ],
            selfEval: [
              { en: "Do I actively study and apply God's Word in a way that deepens my understanding and prepares me to share biblical truth with others?", es: "¿Estudio y aplico activamente la Palabra de Dios de una manera que profundiza mi entendimiento y me prepara para compartir verdad bíblica con otros?" },
              { en: "Do I communicate biblical truths with clarity, patience, and gentleness, making sure my teaching encourages and strengthens others rather than discouraging them?", es: "¿Comunico verdades bíblicas con claridad, paciencia y gentileza, asegurándome de que mi enseñanza aliente y fortaleza a otros en lugar de desalentarlos?" },
              { en: "Do I live the truths I teach, setting an example of integrity and faithfulness in my daily life?", es: "¿Vivo las verdades que enseño, dando ejemplo de integridad y fidelidad en mi vida diaria?" }
            ]
          }]
        },
        {
          day: 4,
          modules: [{
            title: { en: "Not Greedy", es: "No Avaricioso" },
            scripture: { en: "1 Timothy 3:3", es: "1 Timoteo 3:3" },
            keyVerses: [
              { en: "1 Timothy 6:10", es: "1 Timoteo 6:10" },
              { en: "Proverbs 15:27", es: "Proverbios 15:27" },
              { en: "Matthew 6:24", es: "Mateo 6:24" },
              { en: "Hebrews 13:5", es: "Hebreos 13:5" },
              { en: "1 Timothy 6:17-18", es: "1 Timoteo 6:17-18" },
              { en: "Matthew 6:33", es: "Mateo 6:33" },
              { en: "Philippians 4:19", es: "Filipenses 4:19" }
            ],
            selfEval: [
              { en: "Do I prioritize wealth and material possessions above my relationship with God and serving others?", es: "¿Priorizo las riquezas y las posesiones materiales por encima de mi relación con Dios y servir a otros?" },
              { en: "Am I content with what God has provided me, or do I constantly desire more money and possessions?", es: "¿Estoy contento con lo que Dios me ha provisto, o constantemente deseo más dinero y posesiones?" },
              { en: "Do I demonstrate generosity by sharing my resources with others, or do I focus more on accumulating wealth for myself?", es: "¿Demuestro generosidad al compartir mis recursos con otros, o me enfoco más en acumular riqueza para mí?" }
            ]
          }]
        },
        {
          day: 5,
          modules: [{
            title: { en: "Not a New Convert", es: "No ser un Recién Convertido" },
            scripture: { en: "1 Timothy 3:6", es: "1 Timoteo 3:6" },
            keyVerses: [
              { en: "Isaiah 14:12-15", es: "Isaías 14:12-15" },
              { en: "2 Peter 3:18", es: "2 Pedro 3:18" },
              { en: "James 4:6", es: "Santiago 4:6" },
              { en: "Titus 2:7-8", es: "Tito 2:7-8" },
              { en: "Colossians 1:28", es: "Colosenses 1:28" }
            ],
            selfEval: [
              { en: "Am I patient in my spiritual growth, allowing myself the time needed to mature in faith before stepping into leadership roles?", es: "¿Soy paciente en mi crecimiento espiritual, y me permito tomar el tiempo necesario para madurar en la fe antes de dar el paso a funciones de liderazgo?" },
              { en: "Do I recognize the dangers of pride in my journey of faith and protect myself against them, pursuing humility and dependence on God instead of exalting myself?", es: "¿Reconozco los peligros del orgullo en mi camino de fe y me protejo contra ellos, procurando la humildad y depender de Dios en lugar de exaltarme a mí mismo?" },
              { en: "How do I actively support new believers by discipling them and helping them grow in faith before rushing to place them in leadership positions?", es: "¿Cómo apoyo activamente a los nuevos creyentes discipulándolos y ayudándolos a crecer en fe antes de apresurarlos a colocarlos en posiciones de liderazgo?" }
            ]
          }]
        }
      ]
    },
    // ===== WEEK 4: DOCTRINE (5 days) =====
    {
      number: 4,
      title: { en: "Doctrine", es: "Doctrina" },
      section: "doctrine",
      days: [
        {
          day: 1,
          modules: [
            {
              title: { en: "The One True God: Understanding the Trinity", es: "El Único Dios Verdadero: La Comprensión de la Trinidad" },
              scripture: { en: "Deuteronomy 6:4", es: "Deuteronomio 6:4" },
              keyVerses: [
                { en: "Isaiah 45:5", es: "Isaías 45:5" },
                { en: "John 1:1,14", es: "Juan 1:1,14" },
                { en: "Colossians 2:9", es: "Colosenses 2:9" },
                { en: "Acts 5:3-4", es: "Hechos 5:3-4" },
                { en: "Ephesians 1:3-14", es: "Efesios 1:3-14" },
                { en: "John 17:21", es: "Juan 17:21" }
              ],
              selfEval: [
                { en: "How does understanding the Trinity deepen my relationship with God as Father, Son, and Holy Spirit?", es: "¿Cómo profundiza mi relación con Dios como Padre, Hijo y Espíritu Santo el entender la Trinidad?" },
                { en: "Can I explain the biblical basis for the Trinity to someone who asks about my faith?", es: "¿Puedo explicar la base bíblica de la Trinidad a alguien que pregunte sobre mi fe?" },
                { en: "How does the unity of the Trinity inspire me to pursue unity in my church community?", es: "¿Cómo me inspira la unidad de la Trinidad a buscar la unidad en mi comunidad de iglesia?" }
              ]
            },
            {
              title: { en: "The Death, Resurrection & Ascension of Jesus Christ", es: "La Muerte, Resurrección y Ascensión de Jesucristo" },
              scripture: { en: "Romans 5:8", es: "Romanos 5:8" },
              keyVerses: [
                { en: "Isaiah 53:5", es: "Isaías 53:5" },
                { en: "John 19:30", es: "Juan 19:30" },
                { en: "1 Corinthians 15:17", es: "1 Corintios 15:17" },
                { en: "Acts 1:9-11", es: "Hechos 1:9-11" },
                { en: "Philippians 2:9-11", es: "Filipenses 2:9-11" },
                { en: "Hebrews 7:25", es: "Hebreos 7:25" }
              ],
              selfEval: [
                { en: "How does the sacrifice of Christ on the cross personally impact my daily life and decisions?", es: "¿Cómo impacta personalmente el sacrificio de Cristo en la cruz mi vida diaria y mis decisiones?" },
                { en: "What does the resurrection of Jesus mean for my hope and assurance of salvation?", es: "¿Qué significa la resurrección de Jesús para mi esperanza y seguridad de salvación?" },
                { en: "How does knowing that Christ ascended and intercedes for me at the right hand of the Father give me confidence in prayer?", es: "¿Cómo me da confianza en la oración saber que Cristo ascendió e intercede por mí a la diestra del Padre?" }
              ]
            }
          ]
        },
        {
          day: 2,
          modules: [
            {
              title: { en: "The Indwelling & Work of the Holy Spirit", es: "La Morada y Obra del Espíritu Santo" },
              scripture: { en: "Ephesians 1:13-14", es: "Efesios 1:13-14" },
              keyVerses: [
                { en: "1 Corinthians 6:19", es: "1 Corintios 6:19" },
                { en: "John 16:13", es: "Juan 16:13" },
                { en: "Romans 8:14", es: "Romanos 8:14" },
                { en: "Acts 1:8", es: "Hechos 1:8" },
                { en: "Galatians 5:22-23", es: "Gálatas 5:22-23" },
                { en: "1 Corinthians 12:7", es: "1 Corintios 12:7" }
              ],
              selfEval: [
                { en: "Am I living in daily awareness that the Holy Spirit dwells within me, and does that shape my choices?", es: "¿Vivo con la consciencia diaria de que el Espíritu Santo mora en mí, y eso moldea mis decisiones?" },
                { en: "Am I yielding to the Spirit's guidance or resisting His conviction in any area of my life?", es: "¿Me rindo a la guía del Espíritu o resisto Su convicción en algún área de mi vida?" },
                { en: "How am I using the spiritual gifts the Holy Spirit has given me to serve others and build up the church?", es: "¿Cómo estoy usando los dones espirituales que el Espíritu Santo me ha dado para servir a otros y edificar la iglesia?" }
              ]
            },
            {
              title: { en: "The Reality of Sin & Our Need for God", es: "La Realidad del Pecado y Nuestra Necesidad de Dios" },
              scripture: { en: "Romans 3:23", es: "Romanos 3:23" },
              keyVerses: [
                { en: "Genesis 3:6", es: "Génesis 3:6" },
                { en: "Romans 5:12", es: "Romanos 5:12" },
                { en: "Isaiah 59:2", es: "Isaías 59:2" },
                { en: "Romans 6:23", es: "Romanos 6:23" },
                { en: "John 3:16", es: "Juan 3:16" },
                { en: "Ephesians 2:8-9", es: "Efesios 2:8-9" }
              ],
              selfEval: [
                { en: "Do I take sin seriously in my own life, or have I become numb to its effects?", es: "¿Tomo el pecado en serio en mi propia vida, o me he vuelto insensible a sus efectos?" },
                { en: "Am I daily acknowledging my need for God's grace and the redemption found only in Christ?", es: "¿Reconozco diariamente mi necesidad de la gracia de Dios y la redención que se encuentra solo en Cristo?" },
                { en: "How am I helping others understand the reality of sin and the hope of the Gospel?", es: "¿Cómo estoy ayudando a otros a entender la realidad del pecado y la esperanza del Evangelio?" }
              ]
            }
          ]
        },
        {
          day: 3,
          modules: [
            {
              title: { en: "The Eternal Destiny of Humanity", es: "El Destino Eterno de la Humanidad" },
              scripture: { en: "John 3:16", es: "Juan 3:16" },
              keyVerses: [
                { en: "Genesis 1:26-27", es: "Génesis 1:26-27" },
                { en: "Revelation 21:4", es: "Apocalipsis 21:4" },
                { en: "Matthew 25:46", es: "Mateo 25:46" },
                { en: "2 Corinthians 5:10", es: "2 Corintios 5:10" },
                { en: "Romans 10:9", es: "Romanos 10:9" }
              ],
              selfEval: [
                { en: "Does the reality of eternal destiny create urgency in me to share the Gospel with those who don't know Christ?", es: "¿La realidad del destino eterno crea urgencia en mí para compartir el Evangelio con quienes no conocen a Cristo?" },
                { en: "How does the promise of eternal life with God impact the way I handle suffering and trials in this life?", es: "¿Cómo impacta la promesa de vida eterna con Dios la manera en que manejo el sufrimiento y las pruebas en esta vida?" },
                { en: "Am I living each day with an eternal perspective, prioritizing what matters for eternity?", es: "¿Vivo cada día con una perspectiva eterna, priorizando lo que importa para la eternidad?" }
              ]
            },
            {
              title: { en: "God's Grace: Forgiveness, Eternal Life & Faith in Jesus", es: "La Gracia de Dios: Perdón, Vida Eterna y Fe en Jesucristo" },
              scripture: { en: "Ephesians 2:8-9", es: "Efesios 2:8-9" },
              keyVerses: [
                { en: "Romans 3:24", es: "Romanos 3:24" },
                { en: "Titus 3:5", es: "Tito 3:5" },
                { en: "Romans 5:1", es: "Romanos 5:1" },
                { en: "John 1:12", es: "Juan 1:12" },
                { en: "2 Corinthians 5:17", es: "2 Corintios 5:17" },
                { en: "Galatians 2:20", es: "Gálatas 2:20" }
              ],
              selfEval: [
                { en: "Am I resting in God's grace or still trying to earn my standing with God through my own efforts?", es: "¿Descanso en la gracia de Dios o sigo tratando de ganarme mi posición ante Dios por mis propios esfuerzos?" },
                { en: "How does understanding grace change the way I treat others who fall short?", es: "¿Cómo cambia la comprensión de la gracia la manera en que trato a otros que fallan?" },
                { en: "Am I actively extending to others the same grace that God has shown me?", es: "¿Estoy activamente extendiendo a otros la misma gracia que Dios me ha mostrado?" }
              ]
            }
          ]
        },
        {
          day: 4,
          modules: [
            {
              title: { en: "The Bible: God's Word for Us", es: "La Biblia: La Palabra de Dios para Nosotros" },
              scripture: { en: "2 Timothy 3:16-17", es: "2 Timoteo 3:16-17" },
              keyVerses: [
                { en: "Psalm 119:105", es: "Salmo 119:105" },
                { en: "Hebrews 4:12", es: "Hebreos 4:12" },
                { en: "Isaiah 40:8", es: "Isaías 40:8" },
                { en: "Joshua 1:8", es: "Josué 1:8" },
                { en: "Romans 15:4", es: "Romanos 15:4" }
              ],
              selfEval: [
                { en: "Do I approach the Bible as God's living Word that has authority over my life, or merely as a book of good advice?", es: "¿Me acerco a la Biblia como la Palabra viva de Dios que tiene autoridad sobre mi vida, o simplemente como un libro de buenos consejos?" },
                { en: "Am I consistently reading, studying, and meditating on Scripture to grow in my faith?", es: "¿Leo, estudio y medito consistentemente en las Escrituras para crecer en mi fe?" },
                { en: "How am I applying what I learn from the Bible to my daily decisions and relationships?", es: "¿Cómo aplico lo que aprendo de la Biblia a mis decisiones y relaciones diarias?" }
              ]
            },
            {
              title: { en: "The Church: Universal & Local Expression of the Body of Christ", es: "La Iglesia: La Expresión Universal y Local del Cuerpo de Cristo" },
              scripture: { en: "Matthew 16:18", es: "Mateo 16:18" },
              keyVerses: [
                { en: "Ephesians 1:22-23", es: "Efesios 1:22-23" },
                { en: "1 Corinthians 12:27", es: "1 Corintios 12:27" },
                { en: "Hebrews 10:24-25", es: "Hebreos 10:24-25" },
                { en: "Acts 2:42", es: "Hechos 2:42" },
                { en: "Ephesians 4:11-12", es: "Efesios 4:11-12" }
              ],
              selfEval: [
                { en: "Am I actively participating in a local church community, not just attending but truly contributing?", es: "¿Participo activamente en una comunidad de iglesia local, no solo asistiendo sino verdaderamente contribuyendo?" },
                { en: "Do I understand my role in the body of Christ and use my gifts to serve others?", es: "¿Entiendo mi rol en el cuerpo de Cristo y uso mis dones para servir a otros?" },
                { en: "How am I supporting and encouraging other believers in their faith journey?", es: "¿Cómo estoy apoyando y animando a otros creyentes en su caminar de fe?" }
              ]
            }
          ]
        },
        {
          day: 5,
          modules: [{
            title: { en: "The Return of Christ", es: "El Regreso de Cristo" },
            scripture: { en: "Acts 1:11", es: "Hechos 1:11" },
            keyVerses: [
              { en: "1 Thessalonians 4:16-17", es: "1 Tesalonicenses 4:16-17" },
              { en: "Revelation 22:12", es: "Apocalipsis 22:12" },
              { en: "Matthew 24:36", es: "Mateo 24:36" },
              { en: "Titus 2:13", es: "Tito 2:13" },
              { en: "2 Peter 3:9", es: "2 Pedro 3:9" }
            ],
            selfEval: [
              { en: "Does the promise of Christ's return motivate me to live a holy and purposeful life today?", es: "¿La promesa del regreso de Cristo me motiva a vivir una vida santa y con propósito hoy?" },
              { en: "Am I ready to give an account of my life before Christ when He returns?", es: "¿Estoy listo para dar cuenta de mi vida ante Cristo cuando Él regrese?" },
              { en: "How does the hope of Christ's return shape my priorities and the urgency of sharing the Gospel?", es: "¿Cómo moldea la esperanza del regreso de Cristo mis prioridades y la urgencia de compartir el Evangelio?" }
            ]
          }]
        }
      ]
    },
    // ===== WEEK 5: THEOLOGICAL CONVICTIONS (6 days) =====
    {
      number: 5,
      title: { en: "Theological Convictions", es: "Convicciones Teológicas" },
      section: "convictions",
      days: [
        {
          day: 1,
          modules: [
            {
              title: { en: "Creation: God as the Uncreated Creator", es: "La Creación: Dios como el Creador no Creado" },
              scripture: { en: "Genesis 1:1", es: "Génesis 1:1" },
              keyVerses: [
                { en: "Psalm 90:2", es: "Salmos 90:2" },
                { en: "Exodus 20:11", es: "Éxodo 20:11" },
                { en: "Romans 1:20", es: "Romanos 1:20" },
                { en: "Colossians 1:16", es: "Colosenses 1:16" },
                { en: "Isaiah 40:26", es: "Isaías 40:26" }
              ],
              selfEval: [
                { en: "How does believing in God as Creator shape the way I view the world and my purpose in it?", es: "¿Cómo moldea mi visión del mundo y mi propósito en él creer en Dios como Creador?" },
                { en: "Can I articulate a biblical view of creation to someone who holds a different worldview?", es: "¿Puedo articular una visión bíblica de la creación a alguien que tiene una cosmovisión diferente?" },
                { en: "Does my life reflect gratitude and stewardship for the creation God has entrusted to us?", es: "¿Mi vida refleja gratitud y mayordomía por la creación que Dios nos ha encomendado?" }
              ]
            },
            {
              title: { en: "The Virgin Birth", es: "El Nacimiento Virginal" },
              scripture: { en: "Isaiah 7:14", es: "Isaías 7:14" },
              keyVerses: [
                { en: "Luke 1:30-31", es: "Lucas 1:30-31" },
                { en: "Luke 1:35", es: "Lucas 1:35" },
                { en: "Matthew 1:23", es: "Mateo 1:23" },
                { en: "Romans 5:12", es: "Romanos 5:12" },
                { en: "2 Corinthians 5:21", es: "2 Corintios 5:21" }
              ],
              selfEval: [
                { en: "Why is the virgin birth essential to the Gospel and what would it mean if it were not true?", es: "¿Por qué es esencial el nacimiento virginal para el Evangelio y qué significaría si no fuera verdad?" },
                { en: "How does the miraculous nature of Christ's birth strengthen my faith in God's power?", es: "¿Cómo fortalece mi fe en el poder de Dios la naturaleza milagrosa del nacimiento de Cristo?" },
                { en: "Am I prepared to explain the significance of the virgin birth to others?", es: "¿Estoy preparado para explicar la importancia del nacimiento virginal a otros?" }
              ]
            }
          ]
        },
        {
          day: 2,
          modules: [
            {
              title: { en: "Spiritual Gifts: What They Are & Why They Matter", es: "Los Dones Espirituales: Qué Son y Por Qué Son Importantes" },
              scripture: { en: "1 Corinthians 12:4-6", es: "1 Corintios 12:4-6" },
              keyVerses: [
                { en: "1 Corinthians 12:7", es: "1 Corintios 12:7" },
                { en: "Romans 12:6-8", es: "Romanos 12:6-8" },
                { en: "1 Corinthians 12:8-10", es: "1 Corintios 12:8-10" },
                { en: "Ephesians 4:11", es: "Efesios 4:11" },
                { en: "1 Peter 4:10", es: "1 Pedro 4:10" },
                { en: "1 Corinthians 12:11", es: "1 Corintios 12:11" }
              ],
              selfEval: [
                { en: "Have I identified the spiritual gifts God has given me? If not, am I actively seeking to discover them?", es: "¿He identificado los dones espirituales que Dios me ha dado? Si no, ¿estoy activamente buscando descubrirlos?" },
                { en: "Am I using my spiritual gifts to serve others and build up the body of Christ?", es: "¿Estoy usando mis dones espirituales para servir a otros y edificar el cuerpo de Cristo?" },
                { en: "Do I value the different gifts others have, or do I compare and envy?", es: "¿Valoro los diferentes dones que otros tienen, o comparo y envidio?" }
              ]
            },
            {
              title: { en: "Evangelism: The Calling of Every Believer", es: "Evangelismo: El Llamado de Cada Creyente" },
              scripture: { en: "2 Corinthians 5:20", es: "2 Corintios 5:20" },
              keyVerses: [
                { en: "Mark 16:15", es: "Marcos 16:15" },
                { en: "Acts 1:8", es: "Hechos 1:8" },
                { en: "Matthew 5:16", es: "Mateo 5:16" },
                { en: "Romans 10:14", es: "Romanos 10:14" },
                { en: "Matthew 28:19-20", es: "Mateo 28:19-20" }
              ],
              selfEval: [
                { en: "Am I actively sharing my faith with those around me, or have I become complacent?", es: "¿Comparto activamente mi fe con quienes me rodean, o me he vuelto complaciente?" },
                { en: "Do I live in a way that makes others curious about my relationship with Christ?", es: "¿Vivo de una manera que hace que otros sientan curiosidad por mi relación con Cristo?" },
                { en: "What specific steps can I take this week to share the Gospel with someone?", es: "¿Qué pasos específicos puedo tomar esta semana para compartir el Evangelio con alguien?" }
              ]
            }
          ]
        },
        {
          day: 3,
          modules: [
            {
              title: { en: "Baptism: A Public Declaration of Faith", es: "Bautismo: Una Declaración Pública de Fe" },
              scripture: { en: "Matthew 28:19", es: "Mateo 28:19" },
              keyVerses: [
                { en: "Mark 1:9-10", es: "Marcos 1:9-10" },
                { en: "Romans 6:4", es: "Romanos 6:4" },
                { en: "Acts 2:41", es: "Hechos 2:41" },
                { en: "Colossians 2:12", es: "Colosenses 2:12" },
                { en: "Acts 8:36-38", es: "Hechos 8:36-38" }
              ],
              selfEval: [
                { en: "Have I been baptized as an act of obedience and public declaration of my faith in Christ?", es: "¿He sido bautizado como acto de obediencia y declaración pública de mi fe en Cristo?" },
                { en: "Do I understand the significance of baptism as identifying with Christ's death and resurrection?", es: "¿Entiendo el significado del bautismo como identificación con la muerte y resurrección de Cristo?" },
                { en: "Am I encouraging new believers to take this important step of faith?", es: "¿Estoy animando a nuevos creyentes a dar este importante paso de fe?" }
              ]
            },
            {
              title: { en: "Discipleship 1:1: Following Jesus Together", es: "Discipulado 1:1: Siguiendo a Jesús Juntos" },
              scripture: { en: "Matthew 28:19-20", es: "Mateo 28:19-20" },
              keyVerses: [
                { en: "Mark 3:14", es: "Marcos 3:14" },
                { en: "Luke 9:23", es: "Lucas 9:23" },
                { en: "2 Timothy 2:2", es: "2 Timoteo 2:2" },
                { en: "Acts 2:42", es: "Hechos 2:42" },
                { en: "Hebrews 10:24-25", es: "Hebreos 10:24-25" }
              ],
              selfEval: [
                { en: "Who is currently discipling me, and who am I discipling?", es: "¿Quién me está discipulando actualmente, y a quién estoy discipulando yo?" },
                { en: "Am I committed to growing in my own faith through intentional relationships?", es: "¿Estoy comprometido a crecer en mi propia fe a través de relaciones intencionales?" },
                { en: "How can I be more intentional about making disciples in my daily life?", es: "¿Cómo puedo ser más intencional en hacer discípulos en mi vida diaria?" }
              ]
            }
          ]
        },
        {
          day: 4,
          modules: [
            {
              title: { en: "The Role of Women in Ministry", es: "El Papel de las Mujeres en el Ministerio" },
              scripture: { en: "Genesis 1:27", es: "Génesis 1:27" },
              keyVerses: [
                { en: "Genesis 2:18", es: "Génesis 2:18" },
                { en: "Romans 12:6-8", es: "Romanos 12:6-8" },
                { en: "Judges 4-5", es: "Jueces 4-5" },
                { en: "Acts 18:26", es: "Hechos 18:26" },
                { en: "Romans 16:1-2", es: "Romanos 16:1-2" },
                { en: "Titus 2:3-5", es: "Tito 2:3-5" },
                { en: "Galatians 3:28", es: "Gálatas 3:28" }
              ],
              selfEval: [
                { en: "How do I value and encourage the gifts and callings of women in my church community?", es: "¿Cómo valoro y animo los dones y llamados de las mujeres en mi comunidad de iglesia?" },
                { en: "Am I creating space for women to serve and minister according to their gifts?", es: "¿Estoy creando espacio para que las mujeres sirvan y ministren de acuerdo con sus dones?" },
                { en: "How does my understanding of this topic reflect both biblical truth and the heart of Christ?", es: "¿Cómo refleja mi entendimiento de este tema tanto la verdad bíblica como el corazón de Cristo?" }
              ]
            },
            {
              title: { en: "A Biblical Perspective on Homosexuality", es: "Una Perspectiva Bíblica sobre la Homosexualidad" },
              scripture: { en: "Genesis 1:27", es: "Génesis 1:27" },
              keyVerses: [
                { en: "Genesis 2:24", es: "Génesis 2:24" },
                { en: "Matthew 19:4-6", es: "Mateo 19:4-6" },
                { en: "Romans 1:26-27", es: "Romanos 1:26-27" },
                { en: "1 Corinthians 6:9-11", es: "1 Corintios 6:9-11" },
                { en: "Ephesians 4:15", es: "Efesios 4:15" },
                { en: "John 8:1-11", es: "Juan 8:1-11" }
              ],
              selfEval: [
                { en: "Can I hold to biblical truth while still showing genuine love and compassion to all people?", es: "¿Puedo mantener la verdad bíblica mientras muestro amor genuino y compasión a todas las personas?" },
                { en: "Am I prepared to have difficult conversations on this topic with grace and biblical grounding?", es: "¿Estoy preparado para tener conversaciones difíciles sobre este tema con gracia y fundamento bíblico?" },
                { en: "How does my church community reflect both truth and love when engaging with this issue?", es: "¿Cómo refleja mi comunidad de iglesia tanto la verdad como el amor al abordar este tema?" }
              ]
            }
          ]
        },
        {
          day: 5,
          modules: [
            {
              title: { en: "A Biblical Perspective on Abortion", es: "Una Perspectiva Bíblica sobre el Aborto" },
              scripture: { en: "Psalm 139:13-14", es: "Salmos 139:13-14" },
              keyVerses: [
                { en: "Genesis 1:27", es: "Génesis 1:27" },
                { en: "Job 33:4", es: "Job 33:4" },
                { en: "Exodus 20:13", es: "Éxodo 20:13" },
                { en: "Jeremiah 1:5", es: "Jeremías 1:5" },
                { en: "James 1:27", es: "Santiago 1:27" },
                { en: "1 John 1:9", es: "1 Juan 1:9" }
              ],
              selfEval: [
                { en: "How does a biblical view of the sanctity of life shape my convictions and actions?", es: "¿Cómo moldea una visión bíblica de la santidad de la vida mis convicciones y acciones?" },
                { en: "Am I prepared to speak about this topic with both truth and compassion?", es: "¿Estoy preparado para hablar sobre este tema con verdad y compasión?" },
                { en: "How can I actively support and care for those who are vulnerable — including mothers in crisis?", es: "¿Cómo puedo apoyar y cuidar activamente a quienes son vulnerables — incluyendo madres en crisis?" }
              ]
            },
            {
              title: { en: "A Biblical Perspective on Alcohol", es: "Una Perspectiva Bíblica sobre el Alcohol" },
              scripture: { en: "Ephesians 5:18", es: "Efesios 5:18" },
              keyVerses: [
                { en: "Proverbs 20:1", es: "Proverbios 20:1" },
                { en: "Proverbs 23:29-32", es: "Proverbios 23:29-32" },
                { en: "1 Corinthians 6:12", es: "1 Corintios 6:12" },
                { en: "Romans 14:21", es: "Romanos 14:21" },
                { en: "1 Corinthians 10:31", es: "1 Corintios 10:31" }
              ],
              selfEval: [
                { en: "Is my relationship with alcohol honoring to God and edifying to those around me?", es: "¿Mi relación con el alcohol honra a Dios y edifica a quienes me rodean?" },
                { en: "Am I willing to limit my freedom for the sake of a weaker brother or sister?", es: "¿Estoy dispuesto a limitar mi libertad por causa de un hermano o hermana más débil?" },
                { en: "Do I seek to be filled with the Spirit rather than with worldly substitutes?", es: "¿Busco ser lleno del Espíritu en lugar de sustitutos mundanos?" }
              ]
            }
          ]
        },
        {
          day: 6,
          modules: [
            {
              title: { en: "A Biblical Perspective on Divorce", es: "Una Perspectiva Bíblica sobre el Divorcio" },
              scripture: { en: "Malachi 2:16", es: "Malaquías 2:16" },
              keyVerses: [
                { en: "Genesis 2:24", es: "Génesis 2:24" },
                { en: "Matthew 19:6", es: "Mateo 19:6" },
                { en: "Matthew 19:8-9", es: "Mateo 19:8-9" },
                { en: "1 Corinthians 7:15", es: "1 Corintios 7:15" },
                { en: "Matthew 18:15", es: "Mateo 18:15" }
              ],
              selfEval: [
                { en: "Am I investing in and protecting my marriage (or future marriage) according to God's design?", es: "¿Estoy invirtiendo en y protegiendo mi matrimonio (o futuro matrimonio) según el diseño de Dios?" },
                { en: "How do I show grace and support to those in my community who have experienced divorce?", es: "¿Cómo muestro gracia y apoyo a aquellos en mi comunidad que han experimentado el divorcio?" },
                { en: "Am I prepared to counsel others on this topic with both biblical truth and compassion?", es: "¿Estoy preparado para aconsejar a otros sobre este tema con verdad bíblica y compasión?" }
              ]
            },
            {
              title: { en: "Understanding Eschatology: The Return of Christ", es: "Entendiendo la Escatología: El Regreso de Cristo" },
              scripture: { en: "Acts 1:11", es: "Hechos 1:11" },
              keyVerses: [
                { en: "1 Thessalonians 4:16-17", es: "1 Tesalonicenses 4:16-17" },
                { en: "Revelation 20:1-6", es: "Apocalipsis 20:1-6" },
                { en: "Matthew 24:36", es: "Mateo 24:36" },
                { en: "2 Peter 3:9", es: "2 Pedro 3:9" },
                { en: "Titus 2:13", es: "Tito 2:13" }
              ],
              selfEval: [
                { en: "Does the study of eschatology draw me closer to Christ or distract me from living faithfully today?", es: "¿El estudio de la escatología me acerca más a Cristo o me distrae de vivir fielmente hoy?" },
                { en: "Am I able to discuss end-times topics with humility, acknowledging areas of legitimate disagreement?", es: "¿Puedo discutir temas de los últimos tiempos con humildad, reconociendo áreas de legítimo desacuerdo?" },
                { en: "How does my understanding of the end times affect my sense of urgency in ministry and evangelism?", es: "¿Cómo afecta mi entendimiento de los últimos tiempos mi sentido de urgencia en el ministerio y el evangelismo?" }
              ]
            },
            {
              title: { en: "Eternal Security: Our Security in Christ", es: "Seguridad Eterna: Nuestra Seguridad en Cristo" },
              scripture: { en: "John 10:28-29", es: "Juan 10:28-29" },
              keyVerses: [
                { en: "Romans 8:38-39", es: "Romanos 8:38-39" },
                { en: "Ephesians 1:13-14", es: "Efesios 1:13-14" },
                { en: "Philippians 1:6", es: "Filipenses 1:6" },
                { en: "1 John 5:13", es: "1 Juan 5:13" },
                { en: "Hebrews 6:4-6", es: "Hebreos 6:4-6" }
              ],
              selfEval: [
                { en: "Do I rest in the assurance of my salvation, or do I struggle with doubt and insecurity?", es: "¿Descanso en la seguridad de mi salvación, o lucho con dudas e inseguridad?" },
                { en: "Does the doctrine of eternal security lead me to complacency or to deeper gratitude and obedience?", es: "¿La doctrina de la seguridad eterna me lleva a la complacencia o a una gratitud y obediencia más profundas?" },
                { en: "How can I help others find assurance in their relationship with Christ?", es: "¿Cómo puedo ayudar a otros a encontrar seguridad en su relación con Cristo?" }
              ]
            }
          ]
        }
      ]
    }
  ]
};
