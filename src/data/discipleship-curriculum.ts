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

// Localization helper function
export function loc(obj: BilingualString | BilingualArray, lang: string): string | string[] {
  if (lang === 'es') {
    return obj.es;
  }
  return obj.en;
}

export const DISCIPLESHIP_CURRICULUM: DiscipleshipCurriculum = {
  weeks: [
    {
      number: 1,
      know: { en: "What is the Gospel?", es: "¿Qué es el Evangelio?" },
      grow: { en: "What is Salvation?", es: "¿Qué es la Salvación?" },
      centralConcept: {
        en: "The Gospel is the good news of salvation through Jesus Christ: a story of love, redemption, and eternal hope. This message of forgiveness answers life's most important questions through eight essential truths. Salvation is being rescued from the penalty, power, and presence of sin, and being restored to a relationship with God through Jesus Christ.",
        es: "El Evangelio es la buena noticia de salvación a través de Jesucristo: una historia de amor, redención y esperanza eterna. Este mensaje de perdón responde a las preguntas más importantes de la vida por medio de ocho verdades esenciales. La salvación es ser rescatado del castigo, poder y presencia del pecado, y ser restaurado a una relación con Dios a través de Jesucristo."
      },
      memoryVerses: {
        en: ["John 3:16-17", "Ephesians 2:4-5"],
        es: ["Juan 3:16-17", "Efesios 2:4-5"]
      },
      actionStep: {
        en: "The Gospel Summarized (Romans 1:3-4)\nReflection: Take time to reflect on which part of the Gospel story feels most personal to you right now.\nAction Step: What hesitation do I have in taking my next step of faith and trusting Jesus more? What is my next step of obeying Jesus in every area of my life?",
        es: "El Evangelio Resumido (Romanos 1:3-4)\nReflexiona: Dedica un tiempo para reflexionar sobre qué parte de la historia del Evangelio te resulta más personal en este momento.\nAcción a Seguir: ¿Qué duda o temor tengo al dar mi próximo paso de fe y confiar más en Jesús? ¿Cuál es mi próximo paso para obedecer a Jesús en cada área de mi vida?"
      },
      growActionStep: {
        en: "Celebrate your salvation by sharing your story with someone this week. If you have not yet trusted Jesus as your Savior, consider taking that step today.",
        es: "Celebra tu salvación compartiendo tu historia con alguien esta semana. Si aún no has confiado en Jesús como tu Salvador, considera dar ese paso hoy."
      },
      days: [
        {
          day: 1,
          section: "know",
          passages: [
            {
              title: { en: "Creation", es: "Creación" },
              scripture: { en: "Genesis 1:1", es: "Génesis 1:1" },
              reflect: {
                en: "What does this verse teach about God's authority and purpose in Creation?",
                es: "¿Qué enseña este versículo sobre la autoridad y el propósito de Dios en la Creación?"
              },
              apply: {
                en: "How does recognizing God as Creator impact the way you see your own life and purpose?",
                es: "¿De qué manera el reconocer a Dios como Creador impacta la forma en que ves tu propia vida y propósito?"
              }
            },
            {
              title: { en: "The Fall", es: "Caída" },
              scripture: { en: "Romans 3:23", es: "Romanos 3:23" },
              reflect: {
                en: "How does this verse explain the universal need for salvation?",
                es: "¿Cómo este versículo explica la necesidad universal de salvación?"
              },
              apply: {
                en: "In what areas of your life do you see the effects of sin and the fallen condition?",
                es: "¿En qué áreas de tu vida ves los efectos del pecado y la condición caída?"
              }
            },
            {
              title: { en: "Works", es: "Obras" },
              scripture: { en: "Ephesians 2:8-9", es: "Efesios 2:8-9" },
              reflect: {
                en: "What does this passage teach about the role of grace versus works in salvation?",
                es: "¿Qué enseña este pasaje sobre el papel de la gracia frente a las obras en la salvación?"
              },
              apply: {
                en: "Are you resting in God's grace, or are you still trying to earn His approval?",
                es: "¿Estás descansando en la gracia de Dios o sigues tratando de ganarte su aprobación?"
              }
            }
          ]
        },
        {
          day: 2,
          section: "know",
          passages: [
            {
              title: { en: "Incarnation", es: "Encarnación" },
              scripture: { en: "Titus 2:11", es: "Tito 2:11" },
              reflect: {
                en: "How does this verse describe the coming of Jesus and its importance?",
                es: "¿De qué forma este versículo describe la venida de Jesús y su importancia?"
              },
              apply: {
                en: "How can you live today in response to the grace that has been revealed through Christ?",
                es: "¿Cómo puedes vivir hoy en respuesta a la gracia que ha sido manifestada a través de Cristo?"
              }
            },
            {
              title: { en: "Crucifixion", es: "Crucifixión" },
              scripture: { en: "2 Corinthians 5:21", es: "2 Corintios 5:21" },
              reflect: {
                en: "What does this verse reveal about Jesus' purpose in dying on the cross?",
                es: "¿Qué revela este versículo sobre el propósito de Jesús al morir en la cruz?"
              },
              apply: {
                en: "How does the cross influence your perspective on forgiveness and your identity?",
                es: "¿Cómo influye la cruz en tu perspectiva sobre el perdón y tu identidad?"
              }
            },
            {
              title: { en: "Resurrection", es: "Resurrección" },
              scripture: { en: "Romans 8:11", es: "Romanos 8:11" },
              reflect: {
                en: "What does the resurrection mean for those who believe in Jesus?",
                es: "¿Qué significa la resurrección para los que creen en Jesús?"
              },
              apply: {
                en: "How does knowing about the resurrection change the way you live today?",
                es: "¿Cómo el conocimiento de la resurrección cambia la forma en que vives hoy?"
              }
            }
          ]
        },
        {
          day: 3,
          section: "know",
          passages: [
            {
              title: { en: "Justification", es: "Justificación" },
              scripture: { en: "Romans 5:1", es: "Romanos 5:1" },
              reflect: {
                en: "What does it mean to be justified by faith in Jesus Christ?",
                es: "¿Qué significa ser justificado por la fe en Jesucristo?"
              },
              apply: {
                en: "How does justification by faith change your relationship with God?",
                es: "¿Cómo cambia la justificación por la fe tu relación con Dios?"
              }
            },
            {
              title: { en: "Substitution", es: "Sustitución" },
              scripture: { en: "Isaiah 53:5-6", es: "Isaías 53:5-6" },
              reflect: {
                en: "What does it mean that Christ died in our place as our substitute?",
                es: "¿Qué significa que Cristo muriera en nuestro lugar como nuestro sustituto?"
              },
              apply: {
                en: "How does understanding substitution deepen your gratitude for Christ?",
                es: "¿Cómo el entender la sustitución profundiza tu gratitud por Cristo?"
              }
            },
            {
              title: { en: "Imputation", es: "Imputación" },
              scripture: { en: "2 Corinthians 5:21", es: "2 Corintios 5:21" },
              reflect: {
                en: "How does the exchange of Christ's righteousness for our sin comfort you?",
                es: "¿Cómo te consuela el intercambio de la justicia de Cristo por nuestro pecado?"
              },
              apply: {
                en: "What areas of shame or guilt can you surrender to Jesus today?",
                es: "¿Qué áreas de vergüenza o culpa puedes entregar a Jesús hoy?"
              }
            }
          ]
        },
        {
          day: 4,
          section: "know",
          passages: [
            {
              title: { en: "Propitiation", es: "Propiciación" },
              scripture: { en: "Romans 3:25-26", es: "Romanos 3:25-26" },
              reflect: {
                en: "What does it mean that Jesus became the propitiation for our sins?",
                es: "¿Qué significa que Jesús se convirtió en la propiciación por nuestros pecados?"
              },
              apply: {
                en: "How does knowing God's wrath was satisfied in Christ give you peace?",
                es: "¿Cómo el saber que la ira de Dios fue satisfecha en Cristo te da paz?"
              }
            },
            {
              title: { en: "Redemption", es: "Redención" },
              scripture: { en: "Ephesians 1:7", es: "Efesios 1:7" },
              reflect: {
                en: "What is the price of our redemption, and who paid it?",
                es: "¿Cuál es el precio de nuestra redención, y quién lo pagó?"
              },
              apply: {
                en: "How should understanding your redemption price influence how you live?",
                es: "¿Cómo debe influir el entender el precio de tu redención en cómo vives?"
              }
            },
            {
              title: { en: "Reconciliation", es: "Reconciliación" },
              scripture: { en: "2 Corinthians 5:18-19", es: "2 Corintios 5:18-19" },
              reflect: {
                en: "How does reconciliation through Christ heal our broken relationship with God?",
                es: "¿Cómo la reconciliación a través de Cristo sana nuestra relación rota con Dios?"
              },
              apply: {
                en: "In what ways has your relationship with God been restored?",
                es: "¿De qué manera ha sido restaurada tu relación con Dios?"
              }
            }
          ]
        },
        {
          day: 5,
          section: "know",
          passages: [
            {
              title: { en: "Adoption", es: "Adopción" },
              scripture: { en: "Ephesians 1:5", es: "Efesios 1:5" },
              reflect: {
                en: "What does it mean to be adopted into God's family?",
                es: "¿Qué significa ser adoptado a la familia de Dios?"
              },
              apply: {
                en: "How does your identity as God's child affect your daily life and decisions?",
                es: "¿Cómo afecta tu identidad como hijo de Dios tu vida diaria y tus decisiones?"
              }
            },
            {
              title: { en: "New Birth", es: "Nuevo Nacimiento" },
              scripture: { en: "John 3:3-7", es: "Juan 3:3-7" },
              reflect: {
                en: "What is the significance of being 'born again' in Christ?",
                es: "¿Cuál es la importancia de nacer de nuevo en Cristo?"
              },
              apply: {
                en: "What spiritual rebirth have you experienced in your relationship with Jesus?",
                es: "¿Qué renacimiento espiritual has experimentado en tu relación con Jesús?"
              }
            },
            {
              title: { en: "Conversion", es: "Conversión" },
              scripture: { en: "Acts 3:19", es: "Hechos 3:19" },
              reflect: {
                en: "How does repentance and faith lead to genuine conversion?",
                es: "¿Cómo el arrepentimiento y la fe llevan a una conversión genuina?"
              },
              apply: {
                en: "What areas of your life need to be converted or transformed by Christ?",
                es: "¿Qué áreas de tu vida necesitan ser convertidas o transformadas por Cristo?"
              }
            }
          ]
        },
        {
          day: 6,
          section: "grow",
          passages: [
            {
              title: { en: "Regeneration", es: "Regeneración" },
              scripture: { en: "John 6:63", es: "Juan 6:63" },
              reflect: {
                en: "How does the Spirit's life-giving work regenerate us spiritually?",
                es: "¿Cómo la obra vivificadora del Espíritu nos regenera espiritualmente?"
              },
              apply: {
                en: "In what ways has the Holy Spirit renewed your spiritual life?",
                es: "¿De qué manera el Espíritu Santo ha renovado tu vida espiritual?"
              }
            },
            {
              title: { en: "Sanctification", es: "Santificación" },
              scripture: { en: "1 Thessalonians 4:3-4", es: "1 Tesalonicenses 4:3-4" },
              reflect: {
                en: "What is the goal of sanctification in the Christian life?",
                es: "¿Cuál es el objetivo de la santificación en la vida cristiana?"
              },
              apply: {
                en: "How are you allowing the Holy Spirit to sanctify you in daily life?",
                es: "¿Cómo estás permitiendo que el Espíritu Santo te santifique en la vida diaria?"
              }
            },
            {
              title: { en: "Transformation", es: "Transformación" },
              scripture: { en: "Romans 12:2", es: "Romanos 12:2" },
              reflect: {
                en: "How does renewing your mind lead to spiritual transformation?",
                es: "¿Cómo el renovar tu mente conduce a transformación espiritual?"
              },
              apply: {
                en: "What specific thoughts or beliefs need to be transformed in your mind?",
                es: "¿Qué pensamientos o creencias específicas necesitan ser transformados en tu mente?"
              }
            }
          ]
        }
      ]
    },
    {
      number: 2,
      know: { en: "Who is Jesus?", es: "¿Quién es Jesús?" },
      grow: { en: "Following Jesus", es: "Siguiendo a Jesús" },
      centralConcept: {
        en: "Jesus Christ is God the Son—fully God and fully man. He is the Creator of all things, the sustainer of the universe, the redeemer of humanity, and the judge of all creation. His incarnation, death, and resurrection are the central events of history. Following Jesus means surrendering our lives to Him, making Him our supreme treasure and authority.",
        es: "Jesucristo es Dios el Hijo—completamente Dios y completamente hombre. Él es el Creador de todas las cosas, el sostenedor del universo, el redentor de la humanidad, y el juez de toda creación. Su encarnación, muerte y resurrección son los eventos centrales de la historia. Seguir a Jesús significa entregar nuestras vidas a Él, hacerlo nuestro tesoro y autoridad suprema."
      },
      memoryVerses: {
        en: ["Colossians 1:15-17", "Hebrews 1:3"],
        es: ["Colosenses 1:15-17", "Hebreos 1:3"]
      },
      actionStep: {
        en: "Jesus is Lord (Philippians 2:9-11)\nReflection: How has understanding who Jesus is changed your perspective on life?\nAction Step: In what area of your life do you struggle to recognize Jesus as Lord? What would it look like to surrender this area completely to Him?",
        es: "Jesús es Señor (Filipenses 2:9-11)\nReflexiona: ¿Cómo el entender quién es Jesús ha cambiado tu perspectiva sobre la vida?\nAcción a Seguir: ¿En qué área de tu vida luchas por reconocer a Jesús como Señor? ¿Cómo se vería entregue completamente esa área a Él?"
      },
      growActionStep: {
        en: "Take one specific step to follow Jesus more closely this week. This could be serving someone in need, sharing your faith, or sacrificing something to trust Jesus more.",
        es: "Da un paso específico para seguir a Jesús más de cerca esta semana. Esto podría ser servir a alguien necesitado, compartir tu fe, o sacrificar algo para confiar más en Jesús."
      },
      days: [
        {
          day: 1,
          section: "know",
          passages: [
            {
              title: { en: "Eternal Nature", es: "Naturaleza Eterna" },
              scripture: { en: "John 1:1-3", es: "Juan 1:1-3" },
              reflect: {
                en: "What does it mean that Jesus is eternal and was with God from the beginning?",
                es: "¿Qué significa que Jesús sea eterno y haya estado con Dios desde el principio?"
              },
              apply: {
                en: "How does Jesus' eternity give you confidence in His promises?",
                es: "¿Cómo la eternidad de Jesús te da confianza en Sus promesas?"
              }
            },
            {
              title: { en: "Divine Nature", es: "Naturaleza Divina" },
              scripture: { en: "John 5:18", es: "Juan 5:18" },
              reflect: {
                en: "Why did claiming to be equal with God cause such controversy?",
                es: "¿Por qué el afirmar ser igual a Dios causó tanta controversia?"
              },
              apply: {
                en: "What changes when you truly believe Jesus is God?",
                es: "¿Qué cambia cuando verdaderamente crees que Jesús es Dios?"
              }
            },
            {
              title: { en: "Creator of All", es: "Creador de Todo" },
              scripture: { en: "Colossians 1:16-17", es: "Colosenses 1:16-17" },
              reflect: {
                en: "What does it mean that everything was created through Jesus?",
                es: "¿Qué significa que todo fue creado a través de Jesús?"
              },
              apply: {
                en: "How does recognizing Jesus as Creator affect your worship?",
                es: "¿Cómo el reconocer a Jesús como Creador afecta tu adoración?"
              }
            }
          ]
        },
        {
          day: 2,
          section: "know",
          passages: [
            {
              title: { en: "Human Nature", es: "Naturaleza Humana" },
              scripture: { en: "Philippians 2:6-8", es: "Filipenses 2:6-8" },
              reflect: {
                en: "Why was it significant that Jesus became fully human while remaining fully God?",
                es: "¿Por qué fue significativo que Jesús se volviera completamente humano mientras permanecía completamente Dios?"
              },
              apply: {
                en: "What does Jesus' incarnation teach you about God's love and humility?",
                es: "¿Qué te enseña la encarnación de Jesús sobre el amor y la humildad de Dios?"
              }
            },
            {
              title: { en: "Temptation Resisted", es: "Tentación Resistida" },
              scripture: { en: "Hebrews 4:15", es: "Hebreos 4:15" },
              reflect: {
                en: "How is it significant that Jesus was tempted but did not sin?",
                es: "¿Cómo es significativo que Jesús fue tentado pero no pecó?"
              },
              apply: {
                en: "How does Jesus' victory over temptation give you hope in your own struggles?",
                es: "¿Cómo te da esperanza la victoria de Jesús sobre la tentación en tus propias luchas?"
              }
            },
            {
              title: { en: "Perfect Obedience", es: "Obediencia Perfecta" },
              scripture: { en: "John 6:38", es: "Juan 6:38" },
              reflect: {
                en: "What does it mean that Jesus came to do the will of His Father?",
                es: "¿Qué significa que Jesús haya venido a hacer la voluntad de Su Padre?"
              },
              apply: {
                en: "How can you develop a deeper commitment to God's will like Jesus had?",
                es: "¿Cómo puedes desarrollar un compromiso más profundo con la voluntad de Dios como Jesús tenía?"
              }
            }
          ]
        },
        {
          day: 3,
          section: "know",
          passages: [
            {
              title: { en: "Priesthood", es: "Sacerdocio" },
              scripture: { en: "Hebrews 4:14-16", es: "Hebreos 4:14-16" },
              reflect: {
                en: "What does it mean that Jesus is our High Priest?",
                es: "¿Qué significa que Jesús sea nuestro Sumo Sacerdote?"
              },
              apply: {
                en: "How does Jesus' intercession on your behalf change how you approach God?",
                es: "¿Cómo la intercesión de Jesús en tu favor cambia tu forma de acercarte a Dios?"
              }
            },
            {
              title: { en: "Prophetic Ministry", es: "Ministerio Profético" },
              scripture: { en: "Acts 3:22-23", es: "Hechos 3:22-23" },
              reflect: {
                en: "How did Jesus fulfill the role of prophet in His teaching and ministry?",
                es: "¿Cómo Jesús cumplió el papel de profeta en Su enseñanza y ministerio?"
              },
              apply: {
                en: "How are you listening and responding to Jesus' teaching today?",
                es: "¿Cómo estás escuchando y respondiendo a la enseñanza de Jesús hoy?"
              }
            },
            {
              title: { en: "Kingly Authority", es: "Autoridad Real" },
              scripture: { en: "Matthew 28:18", es: "Mateo 28:18" },
              reflect: {
                en: "What is the scope of Jesus' authority as King?",
                es: "¿Cuál es el alcance de la autoridad de Jesús como Rey?"
              },
              apply: {
                en: "How can you submit to Jesus' kingship in your daily decisions?",
                es: "¿Cómo puedes someterte al reinado de Jesús en tus decisiones diarias?"
              }
            }
          ]
        },
        {
          day: 4,
          section: "know",
          passages: [
            {
              title: { en: "Authority Over Nature", es: "Autoridad Sobre la Naturaleza" },
              scripture: { en: "Mark 4:37-41", es: "Marcos 4:37-41" },
              reflect: {
                en: "What does Jesus' power over creation reveal about His divinity?",
                es: "¿Qué revela el poder de Jesús sobre la creación acerca de Su divinidad?"
              },
              apply: {
                en: "When you face overwhelming circumstances, how can you trust in Jesus' power?",
                es: "Cuando enfrentas circunstancias abrumadoras, ¿cómo puedes confiar en el poder de Jesús?"
              }
            },
            {
              title: { en: "Power Over Sickness", es: "Poder Sobre la Enfermedad" },
              scripture: { en: "Matthew 8:16-17", es: "Mateo 8:16-17" },
              reflect: {
                en: "Why did Jesus heal the sick during His ministry?",
                es: "¿Por qué Jesús sanó a los enfermos durante Su ministerio?"
              },
              apply: {
                en: "How does Jesus' healing power extend to your spiritual and emotional wholeness?",
                es: "¿Cómo se extiende el poder sanador de Jesús a tu totalidad espiritual y emocional?"
              }
            },
            {
              title: { en: "Victory Over Death", es: "Victoria Sobre la Muerte" },
              scripture: { en: "Revelation 1:17-18", es: "Apocalipsis 1:17-18" },
              reflect: {
                en: "What does it mean that Jesus holds the keys of death and Hades?",
                es: "¿Qué significa que Jesús tenga las llaves de la muerte y del Hades?"
              },
              apply: {
                en: "How does Jesus' victory over death transform your fear of the future?",
                es: "¿Cómo la victoria de Jesús sobre la muerte transforma tu miedo al futuro?"
              }
            }
          ]
        },
        {
          day: 5,
          section: "know",
          passages: [
            {
              title: { en: "Judge of All", es: "Juez de Todos" },
              scripture: { en: "John 5:27", es: "Juan 5:27" },
              reflect: {
                en: "What does it mean that God has given Jesus authority to judge?",
                es: "¿Qué significa que Dios le haya dado autoridad a Jesús para juzgar?"
              },
              apply: {
                en: "How should Jesus' role as judge influence the way you live?",
                es: "¿Cómo debe influir el papel de Jesús como juez en la forma en que vives?"
              }
            },
            {
              title: { en: "Cosmic Ruler", es: "Gobernante Cósmico" },
              scripture: { en: "Ephesians 1:20-22", es: "Efesios 1:20-22" },
              reflect: {
                en: "What does it mean that Jesus sits at God's right hand ruling over all things?",
                es: "¿Qué significa que Jesús esté sentado a la diestra de Dios gobernando sobre todas las cosas?"
              },
              apply: {
                en: "How does trusting in Christ's cosmic authority give you peace?",
                es: "¿Cómo te da paz confiar en la autoridad cósmica de Cristo?"
              }
            },
            {
              title: { en: "Promised Return", es: "Regreso Prometido" },
              scripture: { en: "Acts 1:11", es: "Hechos 1:11" },
              reflect: {
                en: "What does the promise of Jesus' return mean for believers?",
                es: "¿Qué significa la promesa del regreso de Jesús para los creyentes?"
              },
              apply: {
                en: "How should the hope of Jesus' return shape your priorities today?",
                es: "¿Cómo debe la esperanza del regreso de Jesús moldear tus prioridades hoy?"
              }
            }
          ]
        },
        {
          day: 6,
          section: "grow",
          passages: [
            {
              title: { en: "Surrendering to His Lordship", es: "Entregando Su Señorío" },
              scripture: { en: "Romans 12:1-2", es: "Romanos 12:1-2" },
              reflect: {
                en: "What does it mean to present your body as a living sacrifice to Jesus?",
                es: "¿Qué significa presentar tu cuerpo como sacrificio vivo a Jesús?"
              },
              apply: {
                en: "What areas of your life do you need to fully surrender to Jesus as Lord?",
                es: "¿Qué áreas de tu vida necesitas entregar completamente a Jesús como Señor?"
              }
            },
            {
              title: { en: "Treasure Above All", es: "Tesoro Sobre Todo" },
              scripture: { en: "Philippians 3:8", es: "Filipenses 3:8" },
              reflect: {
                en: "How can you make Jesus your greatest treasure and joy?",
                es: "¿Cómo puedes hacer que Jesús sea tu mayor tesoro y alegría?"
              },
              apply: {
                en: "What do you need to let go of to gain Jesus as your greatest treasure?",
                es: "¿Qué necesitas soltar para obtener a Jesús como tu mayor tesoro?"
              }
            },
            {
              title: { en: "Living for His Glory", es: "Viviendo Para Su Gloria" },
              scripture: { en: "1 Corinthians 10:31", es: "1 Corintios 10:31" },
              reflect: {
                en: "What does it mean to do everything for the glory of Christ?",
                es: "¿Qué significa hacer todo para la gloria de Cristo?"
              },
              apply: {
                en: "How can you reorient your daily activities around bringing glory to Jesus?",
                es: "¿Cómo puedes reorientar tus actividades diarias alrededor de traer gloria a Jesús?"
              }
            }
          ]
        }
      ]
    },
    {
      number: 3,
      know: { en: "The Holy Spirit", es: "El Espíritu Santo" },
      grow: { en: "Living in the Spirit", es: "Viviendo en el Espíritu" },
      centralConcept: {
        en: "The Holy Spirit is God—the third person of the Trinity. At salvation, He indwells every believer, confirming our identity as God's children, interceding for us in prayer, and empowering us to live out our faith. The Spirit's ongoing work sanctifies us, guides us, comforts us, and produces spiritual gifts and fruit within us. Living in the Spirit means yielding to His control and being filled with His presence.",
        es: "El Espíritu Santo es Dios—la tercera persona de la Trinidad. En la salvación, mora en cada creyente, confirmando nuestra identidad como hijos de Dios, intercediendo por nosotros en la oración, y capacitándonos para vivir nuestra fe. La obra continua del Espíritu nos santifica, nos guía, nos consuela, y produce dones espirituales y fruto en nosotros. Vivir en el Espíritu significa ceder a Su control y ser llenos de Su presencia."
      },
      memoryVerses: {
        en: ["Ephesians 1:13-14", "Romans 8:26-27"],
        es: ["Efesios 1:13-14", "Romanos 8:26-27"]
      },
      actionStep: {
        en: "The Spirit's Testimony (Romans 8:15-16)\nReflection: How has the Holy Spirit confirmed your identity as a child of God?\nAction Step: What does it look like to yield to the Holy Spirit's guidance in your life? What is one area where you need the Spirit's wisdom?",
        es: "El Testimonio del Espíritu (Romanos 8:15-16)\nReflexiona: ¿Cómo ha confirmado el Espíritu Santo tu identidad como hijo de Dios?\nAcción a Seguir: ¿Cómo se ve ceder a la guía del Espíritu Santo en tu vida? ¿Cuál es un área donde necesitas la sabiduría del Espíritu?"
      },
      growActionStep: {
        en: "Identify one spiritual gift that the Spirit has given you, and find a way to use it to serve your church community this week.",
        es: "Identifica un don espiritual que el Espíritu te ha dado, y encuentra una manera de usarlo para servir a tu comunidad eclesial esta semana."
      },
      days: [
        {
          day: 1,
          section: "know",
          passages: [
            {
              title: { en: "The Person of the Spirit", es: "La Persona del Espíritu" },
              scripture: { en: "Acts 5:3-4", es: "Hechos 5:3-4" },
              reflect: {
                en: "Why is it important to understand the Holy Spirit as a person and not just a force?",
                es: "¿Por qué es importante entender al Espíritu Santo como una persona y no solo como una fuerza?"
              },
              apply: {
                en: "How should treating the Spirit as a person change your approach to prayer and relationship?",
                es: "¿Cómo debe cambiar tu forma de orar y tu relación el tratar al Espíritu como una persona?"
              }
            },
            {
              title: { en: "The Deity of the Spirit", es: "La Deidad del Espíritu" },
              scripture: { en: "1 Corinthians 2:10-11", es: "1 Corintios 2:10-11" },
              reflect: {
                en: "What does it mean that the Holy Spirit knows the deep things of God?",
                es: "¿Qué significa que el Espíritu Santo conozca las cosas profundas de Dios?"
              },
              apply: {
                en: "How does the Spirit's knowledge and wisdom relate to His guidance in your life?",
                es: "¿Cómo se relaciona el conocimiento y la sabiduría del Espíritu con Su guía en tu vida?"
              }
            },
            {
              title: { en: "The Work of the Spirit", es: "La Obra del Espíritu" },
              scripture: { en: "John 14:26", es: "Juan 14:26" },
              reflect: {
                en: "What are the main works of the Holy Spirit described in Scripture?",
                es: "¿Cuáles son las principales obras del Espíritu Santo descritas en la Escritura?"
              },
              apply: {
                en: "Which of the Spirit's ministries do you need most in your life right now?",
                es: "¿Cuál de los ministerios del Espíritu necesitas más en tu vida en este momento?"
              }
            }
          ]
        },
        {
          day: 2,
          section: "know",
          passages: [
            {
              title: { en: "Baptism in the Spirit", es: "Bautismo en el Espíritu" },
              scripture: { en: "Acts 1:5", es: "Hechos 1:5" },
              reflect: {
                en: "What does baptism in the Holy Spirit mean for believers?",
                es: "¿Qué significa el bautismo en el Espíritu Santo para los creyentes?"
              },
              apply: {
                en: "How has the Spirit been a living reality in your relationship with God?",
                es: "¿Cómo ha sido el Espíritu una realidad viva en tu relación con Dios?"
              }
            },
            {
              title: { en: "Indwelling of the Spirit", es: "Morada del Espíritu" },
              scripture: { en: "1 Corinthians 6:19-20", es: "1 Corintios 6:19-20" },
              reflect: {
                en: "What does it mean that your body is a temple of the Holy Spirit?",
                es: "¿Qué significa que tu cuerpo sea un templo del Espíritu Santo?"
              },
              apply: {
                en: "How should the reality of God's indwelling Spirit affect your choices and lifestyle?",
                es: "¿Cómo debe afectar la realidad de la morada de Dios en tu Espíritu tus elecciones y estilo de vida?"
              }
            },
            {
              title: { en: "Seal of the Spirit", es: "Sello del Espíritu" },
              scripture: { en: "Ephesians 1:13-14", es: "Efesios 1:13-14" },
              reflect: {
                en: "What security does the Holy Spirit's sealing provide for believers?",
                es: "¿Qué seguridad proporciona el sello del Espíritu Santo a los creyentes?"
              },
              apply: {
                en: "How does knowing you're sealed by the Spirit bring assurance to your faith?",
                es: "¿Cómo te trae seguridad el saber que estás sellado por el Espíritu?"
              }
            }
          ]
        },
        {
          day: 3,
          section: "know",
          passages: [
            {
              title: { en: "Guide into Truth", es: "Guía en la Verdad" },
              scripture: { en: "John 16:13", es: "Juan 16:13" },
              reflect: {
                en: "How does the Holy Spirit guide us into all truth?",
                es: "¿Cómo el Espíritu Santo nos guía a toda la verdad?"
              },
              apply: {
                en: "How are you allowing the Spirit to guide your understanding of God's Word?",
                es: "¿Cómo estás permitiendo que el Espíritu guíe tu entendimiento de la Palabra de Dios?"
              }
            },
            {
              title: { en: "Power for Witness", es: "Poder para Testificar" },
              scripture: { en: "Acts 1:8", es: "Hechos 1:8" },
              reflect: {
                en: "What does it mean to receive power from the Holy Spirit to be witnesses?",
                es: "¿Qué significa recibir poder del Espíritu Santo para ser testigos?"
              },
              apply: {
                en: "How can you rely on the Spirit's power in sharing your faith with others?",
                es: "¿Cómo puedes confiar en el poder del Espíritu al compartir tu fe con otros?"
              }
            },
            {
              title: { en: "Fruit of the Spirit", es: "Fruto del Espíritu" },
              scripture: { en: "Galatians 5:22-23", es: "Gálatas 5:22-23" },
              reflect: {
                en: "What does the fruit of the Spirit reveal about a Spirit-filled life?",
                es: "¿Qué revela el fruto del Espíritu acerca de una vida llena del Espíritu?"
              },
              apply: {
                en: "Which fruit of the Spirit needs to be more evident in your character?",
                es: "¿Cuál fruto del Espíritu necesita ser más evidente en tu carácter?"
              }
            }
          ]
        },
        {
          day: 4,
          section: "know",
          passages: [
            {
              title: { en: "Conviction of Sin", es: "Convicción de Pecado" },
              scripture: { en: "John 16:8", es: "Juan 16:8" },
              reflect: {
                en: "How does the Holy Spirit work to convict people of sin?",
                es: "¿Cómo trabaja el Espíritu Santo para convencer a las personas del pecado?"
              },
              apply: {
                en: "How have you experienced the Spirit's conviction leading you to repentance?",
                es: "¿Cómo has experimentado la convicción del Espíritu llevándote al arrepentimiento?"
              }
            },
            {
              title: { en: "Empowerment for Obedience", es: "Capacitación para la Obediencia" },
              scripture: { en: "Zechariah 4:6", es: "Zacarías 4:6" },
              reflect: {
                en: "How does the Spirit empower believers to obey God's commands?",
                es: "¿Cómo capacita el Espíritu a los creyentes para obedecer los mandamientos de Dios?"
              },
              apply: {
                en: "What command of God do you need the Spirit's power to obey?",
                es: "¿Qué mandamiento de Dios necesitas la fuerza del Espíritu para obedecer?"
              }
            },
            {
              title: { en: "Intercession for Believers", es: "Intercesión por los Creyentes" },
              scripture: { en: "Romans 8:26-27", es: "Romanos 8:26-27" },
              reflect: {
                en: "What comfort is there in knowing the Spirit intercedes for us?",
                es: "¿Qué consuelo hay en saber que el Espíritu intercede por nosotros?"
              },
              apply: {
                en: "How does the Spirit's intercession give you confidence in prayer?",
                es: "¿Cómo la intercesión del Espíritu te da confianza en la oración?"
              }
            }
          ]
        },
        {
          day: 5,
          section: "know",
          passages: [
            {
              title: { en: "Gifts of the Spirit", es: "Dones del Espíritu" },
              scripture: { en: "1 Corinthians 12:4-11", es: "1 Corintios 12:4-11" },
              reflect: {
                en: "Why does the Holy Spirit distribute different gifts to different believers?",
                es: "¿Por qué el Espíritu Santo distribuye diferentes dones a diferentes creyentes?"
              },
              apply: {
                en: "What spiritual gifts has the Spirit given you, and how can you develop them?",
                es: "¿Qué dones espirituales te ha dado el Espíritu, y cómo puedes desarrollarlos?"
              }
            },
            {
              title: { en: "Filling of the Spirit", es: "Plenitud del Espíritu" },
              scripture: { en: "Ephesians 5:18", es: "Efesios 5:18" },
              reflect: {
                en: "What does it mean to be filled with the Holy Spirit?",
                es: "¿Qué significa estar lleno del Espíritu Santo?"
              },
              apply: {
                en: "How can you cultivate being continually filled with the Spirit?",
                es: "¿Cómo puedes cultivar estar continuamente lleno del Espíritu?"
              }
            },
            {
              title: { en: "Leading of the Spirit", es: "Dirección del Espíritu" },
              scripture: { en: "Romans 8:14", es: "Romanos 8:14" },
              reflect: {
                en: "How does the Holy Spirit lead believers in their life decisions?",
                es: "¿Cómo el Espíritu Santo dirige a los creyentes en sus decisiones de vida?"
              },
              apply: {
                en: "In what decision are you seeking the Spirit's guidance right now?",
                es: "¿En qué decisión estás buscando la guía del Espíritu en este momento?"
              }
            }
          ]
        },
        {
          day: 6,
          section: "grow",
          passages: [
            {
              title: { en: "Quenching vs. Grieving", es: "Apagar vs. Entristecer" },
              scripture: { en: "1 Thessalonians 5:19; Ephesians 4:30", es: "1 Tesalonicenses 5:19; Efesios 4:30" },
              reflect: {
                en: "How do we quench or grieve the Holy Spirit with our choices?",
                es: "¿Cómo apagamos o entristecemos al Espíritu Santo con nuestras elecciones?"
              },
              apply: {
                en: "What behaviors or attitudes need to change so you don't grieve the Spirit?",
                es: "¿Qué comportamientos o actitudes necesitan cambiar para no entristecer al Espíritu?"
              }
            },
            {
              title: { en: "Living by the Spirit", es: "Viviendo en el Espíritu" },
              scripture: { en: "Galatians 5:25", es: "Gálatas 5:25" },
              reflect: {
                en: "What does it mean to live by and walk by the Spirit?",
                es: "¿Qué significa vivir por el Espíritu y caminar en el Espíritu?"
              },
              apply: {
                en: "How can you make daily choices that align with the Spirit's desires?",
                es: "¿Cómo puedes tomar decisiones diarias que se alineen con los deseos del Espíritu?"
              }
            },
            {
              title: { en: "Abiding in the Spirit", es: "Permaneciendo en el Espíritu" },
              scripture: { en: "John 15:4-5", es: "Juan 15:4-5" },
              reflect: {
                en: "What does abiding in the Spirit mean for a fruitful Christian life?",
                es: "¿Qué significa permanecer en el Espíritu para una vida cristiana fructífera?"
              },
              apply: {
                en: "What practices help you abide in the Spirit on a daily basis?",
                es: "¿Qué prácticas te ayudan a permanecer en el Espíritu día a día?"
              }
            }
          ]
        }
      ]
    },
    {
      number: 4,
      know: { en: "Authority of Scripture", es: "Autoridad de la Escritura" },
      grow: { en: "Living by Scripture", es: "Viviendo por la Escritura" },
      centralConcept: {
        en: "The Bible is God's authoritative and complete revelation of Himself to humanity. It is true, sufficient, and relevant for all of life. Scripture is our ultimate standard for faith and practice—the measure by which all beliefs and behaviors are evaluated. Every Christian is called to submit to Scripture's authority, to study it, hide it in their heart, and apply its truth to their daily life and decisions.",
        es: "La Biblia es la revelación autoritaria y completa de Dios a la humanidad. Es verdadera, suficiente y relevante para toda la vida. La Escritura es nuestro estándar supremo para la fe y la práctica—la medida por la cual todas las creencias y comportamientos son evaluados. Cada cristiano está llamado a someterse a la autoridad de la Escritura, a estudiarla, guardarla en su corazón, y aplicar su verdad a su vida diaria y decisiones."
      },
      memoryVerses: {
        en: ["2 Timothy 3:16-17", "Psalm 119:105"],
        es: ["2 Timoteo 3:16-17", "Salmo 119:105"]
      },
      actionStep: {
        en: "All Scripture is God-breathed (2 Peter 1:20-21)\nReflection: How has Scripture shaped your understanding of God and His will?\nAction Step: What is one area of your life where you need to align your beliefs or behavior with what Scripture teaches?",
        es: "Toda la Escritura es inspirada por Dios (2 Pedro 1:20-21)\nReflexiona: ¿Cómo ha moldeado la Escritura tu comprensión de Dios y Su voluntad?\nAcción a Seguir: ¿Cuál es un área de tu vida donde necesitas alinear tus creencias o comportamiento con lo que enseña la Escritura?"
      },
      growActionStep: {
        en: "Establish a daily Scripture reading and study practice this week. Choose one passage and meditate on it deeply, allowing God's Word to transform your thinking.",
        es: "Establece una práctica diaria de lectura y estudio de la Escritura esta semana. Elige un pasaje y medita en él profundamente, permitiendo que la Palabra de Dios transforme tu pensamiento."
      },
      days: [
        {
          day: 1,
          section: "know",
          passages: [
            {
              title: { en: "Inspiration", es: "Inspiración" },
              scripture: { en: "2 Timothy 3:16", es: "2 Timoteo 3:16" },
              reflect: {
                en: "What does it mean that Scripture is God-breathed?",
                es: "¿Qué significa que la Escritura sea inspirada por Dios?"
              },
              apply: {
                en: "How should knowing Scripture is God's Word affect the way you approach it?",
                es: "¿Cómo debe afectar el saber que la Escritura es Palabra de Dios la forma en que la abordes?"
              }
            },
            {
              title: { en: "Infallibility", es: "Infalibilidad" },
              scripture: { en: "Proverbs 30:5", es: "Proverbios 30:5" },
              reflect: {
                en: "What does it mean that God's Word is without error?",
                es: "¿Qué significa que la Palabra de Dios sea sin error?"
              },
              apply: {
                en: "How does the reliability of Scripture build your faith?",
                es: "¿Cómo construye la confiabilidad de la Escritura tu fe?"
              }
            },
            {
              title: { en: "Authority", es: "Autoridad" },
              scripture: { en: "Isaiah 55:11", es: "Isaías 55:11" },
              reflect: {
                en: "What authority does God's Word hold in our lives?",
                es: "¿Qué autoridad tiene la Palabra de Dios en nuestras vidas?"
              },
              apply: {
                en: "In what areas of your life do you struggle to submit to Scripture's authority?",
                es: "¿En qué áreas de tu vida luchas por someterte a la autoridad de la Escritura?"
              }
            }
          ]
        },
        {
          day: 2,
          section: "know",
          passages: [
            {
              title: { en: "Completeness", es: "Completitud" },
              scripture: { en: "2 Timothy 3:17", es: "2 Timoteo 3:17" },
              reflect: {
                en: "How does Scripture equip us for every good work?",
                es: "¿Cómo la Escritura nos equipa para toda buena obra?"
              },
              apply: {
                en: "What area of your life has Scripture transformed or equipped you for?",
                es: "¿Qué área de tu vida ha transformado o equipado la Escritura?"
              }
            },
            {
              title: { en: "Sufficiency", es: "Suficiencia" },
              scripture: { en: "Psalm 119:97-99", es: "Salmo 119:97-99" },
              reflect: {
                en: "Why is Scripture sufficient for all of life's needs?",
                es: "¿Por qué es la Escritura suficiente para todas las necesidades de la vida?"
              },
              apply: {
                en: "How can you learn to depend on Scripture rather than worldly wisdom?",
                es: "¿Cómo puedes aprender a depender de la Escritura en lugar de la sabiduría mundana?"
              }
            },
            {
              title: { en: "Clarity", es: "Claridad" },
              scripture: { en: "Psalm 119:130", es: "Salmo 119:130" },
              reflect: {
                en: "How does Scripture illuminate our understanding?",
                es: "¿Cómo ilumina la Escritura nuestro entendimiento?"
              },
              apply: {
                en: "What part of Scripture has become clearer to you as you've studied it?",
                es: "¿Qué parte de la Escritura se ha vuelto más clara para ti mientras la has estudiado?"
              }
            }
          ]
        },
        {
          day: 3,
          section: "know",
          passages: [
            {
              title: { en: "Purpose of Scripture", es: "Propósito de la Escritura" },
              scripture: { en: "John 20:31", es: "Juan 20:31" },
              reflect: {
                en: "What is the primary purpose of Scripture according to John?",
                es: "¿Cuál es el propósito principal de la Escritura según Juan?"
              },
              apply: {
                en: "How does Scripture point you to Jesus and faith in Him?",
                es: "¿Cómo te señala la Escritura a Jesús y a la fe en Él?"
              }
            },
            {
              title: { en: "Living by Scripture", es: "Viviendo por la Escritura" },
              scripture: { en: "Matthew 4:4", es: "Mateo 4:4" },
              reflect: {
                en: "What does it mean to live by every word from God's mouth?",
                es: "¿Qué significa vivir por toda palabra que sale de la boca de Dios?"
              },
              apply: {
                en: "How can you allow Scripture to guide your daily decisions?",
                es: "¿Cómo puedes permitir que la Escritura guíe tus decisiones diarias?"
              }
            },
            {
              title: { en: "Testing by Scripture", es: "Prueba por la Escritura" },
              scripture: { en: "Acts 17:11", es: "Hechos 17:11" },
              reflect: {
                en: "Why is it important to test teachings against Scripture?",
                es: "¿Por qué es importante probar las enseñanzas contra la Escritura?"
              },
              apply: {
                en: "How can you develop discernment to evaluate what you hear by Scripture?",
                es: "¿Cómo puedes desarrollar discernimiento para evaluar lo que escuchas por la Escritura?"
              }
            }
          ]
        },
        {
          day: 4,
          section: "know",
          passages: [
            {
              title: { en: "Meditating on God's Word", es: "Meditando en la Palabra de Dios" },
              scripture: { en: "Psalm 1:2-3", es: "Salmo 1:2-3" },
              reflect: {
                en: "What are the benefits of meditating on God's Word?",
                es: "¿Cuáles son los beneficios de meditar en la Palabra de Dios?"
              },
              apply: {
                en: "What practices help you meditate deeply on Scripture?",
                es: "¿Qué prácticas te ayudan a meditar profundamente en la Escritura?"
              }
            },
            {
              title: { en: "Studying God's Word", es: "Estudiando la Palabra de Dios" },
              scripture: { en: "2 Timothy 2:15", es: "2 Timoteo 2:15" },
              reflect: {
                en: "Why is diligent study of God's Word important?",
                es: "¿Por qué es importante el estudio diligente de la Palabra de Dios?"
              },
              apply: {
                en: "What is your approach to studying Scripture, and how can you improve?",
                es: "¿Cuál es tu enfoque para estudiar la Escritura, y cómo puedes mejorar?"
              }
            },
            {
              title: { en: "Hiding God's Word in Your Heart", es: "Guardando la Palabra de Dios en Tu Corazón" },
              scripture: { en: "Psalm 119:11", es: "Salmo 119:11" },
              reflect: {
                en: "How does memorizing and treasuring God's Word help us?",
                es: "¿Cómo memorizar y atesorar la Palabra de Dios nos ayuda?"
              },
              apply: {
                en: "What Scripture verses have you hidden in your heart, and how have they guided you?",
                es: "¿Qué versículos has guardado en tu corazón, y cómo te han guiado?"
              }
            }
          ]
        },
        {
          day: 5,
          section: "know",
          passages: [
            {
              title: { en: "Power of God's Word", es: "Poder de la Palabra de Dios" },
              scripture: { en: "Hebrews 4:12", es: "Hebreos 4:12" },
              reflect: {
                en: "What makes God's Word powerful and effective?",
                es: "¿Qué hace que la Palabra de Dios sea poderosa y eficaz?"
              },
              apply: {
                en: "How have you experienced the transformative power of Scripture?",
                es: "¿Cómo has experimentado el poder transformador de la Escritura?"
              }
            },
            {
              title: { en: "Enduring Word", es: "Palabra que Permanece" },
              scripture: { en: "1 Peter 1:23-25", es: "1 Pedro 1:23-25" },
              reflect: {
                en: "Why is God's Word eternal and unchanging?",
                es: "¿Por qué la Palabra de Dios es eterna e inmutable?"
              },
              apply: {
                en: "How does the permanence of God's Word give you stability?",
                es: "¿Cómo te da estabilidad la permanencia de la Palabra de Dios?"
              }
            },
            {
              title: { en: "Applying Scripture", es: "Aplicando la Escritura" },
              scripture: { en: "James 1:22-25", es: "Santiago 1:22-25" },
              reflect: {
                en: "Why is it important to apply Scripture and not just hear it?",
                es: "¿Por qué es importante aplicar la Escritura y no solo escucharla?"
              },
              apply: {
                en: "What truth from Scripture have you struggled to apply to your life?",
                es: "¿Qué verdad de la Escritura has tenido dificultad en aplicar a tu vida?"
              }
            }
          ]
        },
        {
          day: 6,
          section: "grow",
          passages: [
            {
              title: { en: "Reflecting on Scripture", es: "Reflexionando Sobre la Escritura" },
              scripture: { en: "Joshua 1:8", es: "Josué 1:8" },
              reflect: {
                en: "How does meditation on Scripture bring success and prosperity?",
                es: "¿Cómo la meditación en la Escritura trae éxito y prosperidad?"
              },
              apply: {
                en: "How can you make Scripture reflection a central part of your daily routine?",
                es: "¿Cómo puedes hacer que la reflexión de la Escritura sea una parte central de tu rutina diaria?"
              }
            },
            {
              title: { en: "Proclaiming Scripture", es: "Proclamando la Escritura" },
              scripture: { en: "2 Timothy 4:2", es: "2 Timoteo 4:2" },
              reflect: {
                en: "How important is it to proclaim and share God's Word with others?",
                es: "¿Qué tan importante es proclamar y compartir la Palabra de Dios con otros?"
              },
              apply: {
                en: "How can you boldly share Scripture with those around you?",
                es: "¿Cómo puedes compartir audazmente la Escritura con los que te rodean?"
              }
            },
            {
              title: { en: "Trusting Scripture", es: "Confiando en la Escritura" },
              scripture: { en: "Proverbs 30:5-6", es: "Proverbios 30:5-6" },
              reflect: {
                en: "What does it mean to trust completely in God's Word?",
                es: "¿Qué significa confiar completamente en la Palabra de Dios?"
              },
              apply: {
                en: "What doubts do you need to replace with trust in God's Word?",
                es: "¿Qué dudas necesitas reemplazar con confianza en la Palabra de Dios?"
              }
            }
          ]
        }
      ]
    },
    {
      number: 5,
      know: { en: "Essentials of Prayer", es: "Esenciales de la Oración" },
      grow: { en: "Living in Prayer", es: "Viviendo en Oración" },
      centralConcept: {
        en: "Prayer is intimate communication with our loving Father through Jesus Christ. Prayer is both a privilege and a command—we are invited to bring every need, concern, and thanksgiving to God with confidence and dependence. Prayer is the primary means of accessing God's power, wisdom, and provision. A life of prayer cultivates a deeper relationship with God, aligns our hearts with His will, and opens us to the transformative work of the Holy Spirit.",
        es: "La oración es comunicación íntima con nuestro Padre amoroso a través de Jesucristo. La oración es tanto un privilegio como un mandato—estamos invitados a llevar a Dios cada necesidad, preocupación y acción de gracias con confianza y dependencia. La oración es el medio primordial para acceder al poder, la sabiduría y la provisión de Dios. Una vida de oración cultiva una relación más profunda con Dios, alinea nuestros corazones con Su voluntad, y nos abre a la obra transformadora del Espíritu Santo."
      },
      memoryVerses: {
        en: ["Philippians 4:6-7", "1 Thessalonians 5:17"],
        es: ["Filipenses 4:6-7", "1 Tesalonicenses 5:17"]
      },
      actionStep: {
        en: "Praying According to God's Will (1 John 5:14-15)\nReflection: How has prayer changed your relationship with God?\nAction Step: What specific need or concern will you bring to God in prayer this week? How will you seek His will while making your request?",
        es: "Orando Según la Voluntad de Dios (1 Juan 5:14-15)\nReflexiona: ¿Cómo ha cambiado la oración tu relación con Dios?\nAcción a Seguir: ¿Qué necesidad específica o preocupación llevarás a Dios en oración esta semana? ¿Cómo buscarás Su voluntad mientras haces tu petición?"
      },
      growActionStep: {
        en: "Establish a prayer practice this week that includes adoration, confession, gratitude, and supplication (ACTS method). Spend time interceding for others and watching how God works.",
        es: "Establece una práctica de oración esta semana que incluya adoración, confesión, gratitud y súplica (método ACTS). Dedica tiempo a interceder por otros y observa cómo trabaja Dios."
      },
      days: [
        {
          day: 1,
          section: "know",
          passages: [
            {
              title: { en: "Prayer as Privilege", es: "Oración como Privilegio" },
              scripture: { en: "Hebrews 4:16", es: "Hebreos 4:16" },
              reflect: {
                en: "What does it mean to approach the throne of grace with confidence?",
                es: "¿Qué significa acercarse al trono de la gracia con confianza?"
              },
              apply: {
                en: "How does understanding prayer as privilege change your prayer life?",
                es: "¿Cómo cambia tu vida de oración el entender la oración como privilegio?"
              }
            },
            {
              title: { en: "Prayer as Command", es: "Oración como Mandato" },
              scripture: { en: "1 Thessalonians 5:17", es: "1 Tesalonicenses 5:17" },
              reflect: {
                en: "What does it mean to pray without ceasing?",
                es: "¿Qué significa orar sin cesar?"
              },
              apply: {
                en: "How can you cultivate a lifestyle of continuous prayer?",
                es: "¿Cómo puedes cultivar un estilo de vida de oración continua?"
              }
            },
            {
              title: { en: "Prayer as Communication", es: "Oración como Comunicación" },
              scripture: { en: "John 15:7", es: "Juan 15:7" },
              reflect: {
                en: "How does abiding in Jesus affect our prayer life?",
                es: "¿Cómo afecta el permanecer en Jesús nuestra vida de oración?"
              },
              apply: {
                en: "What does abiding in Christ look like in your prayer practice?",
                es: "¿Cómo se ve permanecer en Cristo en tu práctica de oración?"
              }
            }
          ]
        },
        {
          day: 2,
          section: "know",
          passages: [
            {
              title: { en: "Adoration in Prayer", es: "Adoración en la Oración" },
              scripture: { en: "Psalm 95:1-7", es: "Salmo 95:1-7" },
              reflect: {
                en: "What does it mean to come before God with adoration and praise?",
                es: "¿Qué significa venir ante Dios con adoración y alabanza?"
              },
              apply: {
                en: "How does beginning prayer with adoration change your perspective?",
                es: "¿Cómo comienza la oración con adoración cambiar tu perspectiva?"
              }
            },
            {
              title: { en: "Confession in Prayer", es: "Confesión en la Oración" },
              scripture: { en: "1 John 1:9", es: "1 Juan 1:9" },
              reflect: {
                en: "What does confession and forgiveness accomplish in prayer?",
                es: "¿Qué logra la confesión y el perdón en la oración?"
              },
              apply: {
                en: "What sin do you need to confess and find forgiveness for?",
                es: "¿Qué pecado necesitas confesar y encontrar perdón?"
              }
            },
            {
              title: { en: "Gratitude in Prayer", es: "Gratitud en la Oración" },
              scripture: { en: "Philippians 4:4-6", es: "Filipenses 4:4-6" },
              reflect: {
                en: "How does gratitude change the nature of our prayers?",
                es: "¿Cómo cambia la gratitud la naturaleza de nuestras oraciones?"
              },
              apply: {
                en: "What are you grateful for that you need to thank God for in prayer?",
                es: "¿Por qué estás agradecido que necesitas darle gracias a Dios en oración?"
              }
            }
          ]
        },
        {
          day: 3,
          section: "know",
          passages: [
            {
              title: { en: "Supplication in Prayer", es: "Súplica en la Oración" },
              scripture: { en: "Philippians 4:6-7", es: "Filipenses 4:6-7" },
              reflect: {
                en: "What does it mean to make requests to God with thanksgiving?",
                es: "¿Qué significa hacer peticiones a Dios con acción de gracias?"
              },
              apply: {
                en: "What needs are you bringing to God through supplication?",
                es: "¿Qué necesidades llevas a Dios mediante la súplica?"
              }
            },
            {
              title: { en: "Intercession", es: "Intercesión" },
              scripture: { en: "1 Timothy 2:1-2", es: "1 Timoteo 2:1-2" },
              reflect: {
                en: "Why is intercession for others an important part of prayer?",
                es: "¿Por qué es importante la intercesión por otros como parte de la oración?"
              },
              apply: {
                en: "Who are you called to intercede for, and how will you do so?",
                es: "¿Por quién estás llamado a interceder, y cómo lo harás?"
              }
            },
            {
              title: { en: "Boldness in Prayer", es: "Audacia en la Oración" },
              scripture: { en: "Ephesians 3:14-19", es: "Efesios 3:14-19" },
              reflect: {
                en: "What gives us boldness to pray for great things?",
                es: "¿Qué nos da audacia para orar por cosas grandes?"
              },
              apply: {
                en: "What great things is God inviting you to pray for?",
                es: "¿Qué cosas grandes te está invitando Dios a orar?"
              }
            }
          ]
        },
        {
          day: 4,
          section: "know",
          passages: [
            {
              title: { en: "Persistence in Prayer", es: "Persistencia en la Oración" },
              scripture: { en: "Luke 18:1-8", es: "Lucas 18:1-8" },
              reflect: {
                en: "Why does Jesus teach about persistence in prayer?",
                es: "¿Por qué enseña Jesús sobre la persistencia en la oración?"
              },
              apply: {
                en: "What are you persisting in prayer about despite delays?",
                es: "¿En qué estás persistiendo en oración a pesar de los retrasos?"
              }
            },
            {
              title: { en: "Faith in Prayer", es: "Fe en la Oración" },
              scripture: { en: "Mark 11:24", es: "Marcos 11:24" },
              reflect: {
                en: "How does faith affect the answers we receive from prayer?",
                es: "¿Cómo afecta la fe las respuestas que recibimos de la oración?"
              },
              apply: {
                en: "Where do you need to deepen your faith as you pray?",
                es: "¿Dónde necesitas profundizar tu fe mientras oras?"
              }
            },
            {
              title: { en: "Alignment with God's Will", es: "Alineación con la Voluntad de Dios" },
              scripture: { en: "1 John 5:14-15", es: "1 Juan 5:14-15" },
              reflect: {
                en: "How does praying according to God's will ensure our prayers are answered?",
                es: "¿Cómo orar según la voluntad de Dios asegura que nuestras oraciones sean respondidas?"
              },
              apply: {
                en: "How are you seeking God's will in your prayers?",
                es: "¿Cómo estás buscando la voluntad de Dios en tus oraciones?"
              }
            }
          ]
        },
        {
          day: 5,
          section: "know",
          passages: [
            {
              title: { en: "Corporate Prayer", es: "Oración Corporativa" },
              scripture: { en: "Matthew 18:19-20", es: "Mateo 18:19-20" },
              reflect: {
                en: "Why is praying together as believers significant?",
                es: "¿Por qué es significativo orar juntos como creyentes?"
              },
              apply: {
                en: "How can you engage more in corporate prayer with your church?",
                es: "¿Cómo puedes participar más en la oración corporativa con tu iglesia?"
              }
            },
            {
              title: { en: "Prayer and Fasting", es: "Oración y Ayuno" },
              scripture: { en: "Matthew 6:16-18", es: "Mateo 6:16-18" },
              reflect: {
                en: "How does fasting deepen our prayer experience?",
                es: "¿Cómo el ayuno profundiza nuestra experiencia de oración?"
              },
              apply: {
                en: "When might fasting be appropriate for a specific prayer concern?",
                es: "¿Cuándo podría ser apropiado el ayuno para una preocupación de oración específica?"
              }
            },
            {
              title: { en: "Peace Through Prayer", es: "Paz a través de la Oración" },
              scripture: { en: "Philippians 4:6-7", es: "Filipenses 4:6-7" },
              reflect: {
                en: "How does prayer bring peace that transcends understanding?",
                es: "¿Cómo trae la oración paz que sobrepasa el entendimiento?"
              },
              apply: {
                en: "What worry or anxiety can you release through prayer today?",
                es: "¿Qué preocupación o ansiedad puedes liberar a través de la oración hoy?"
              }
            }
          ]
        },
        {
          day: 6,
          section: "grow",
          passages: [
            {
              title: { en: "Praying God's Word", es: "Orando la Palabra de Dios" },
              scripture: { en: "Psalm 119:169-176", es: "Salmo 119:169-176" },
              reflect: {
                en: "How can we use Scripture as a basis for our prayers?",
                es: "¿Cómo podemos usar la Escritura como base para nuestras oraciones?"
              },
              apply: {
                en: "How will you incorporate Scripture into your prayer practice?",
                es: "¿Cómo incorporarás la Escritura en tu práctica de oración?"
              }
            },
            {
              title: { en: "Listening in Prayer", es: "Escuchar en la Oración" },
              scripture: { en: "Psalm 46:10", es: "Salmo 46:10" },
              reflect: {
                en: "How important is it to listen to God during prayer?",
                es: "¿Qué tan importante es escuchar a Dios durante la oración?"
              },
              apply: {
                en: "How can you create space to listen for God's voice in prayer?",
                es: "¿Cómo puedes crear espacio para escuchar la voz de Dios en la oración?"
              }
            },
            {
              title: { en: "Living Prayer", es: "Viviendo en Oración" },
              scripture: { en: "Colossians 3:17", es: "Colosenses 3:17" },
              reflect: {
                en: "What does it mean to do everything in the name of the Lord in prayer?",
                es: "¿Qué significa hacer todo en el nombre del Señor en oración?"
              },
              apply: {
                en: "How can your entire life become an expression of prayer to God?",
                es: "¿Cómo puede tu vida entera convertirse en una expresión de oración a Dios?"
              }
            }
          ]
        }
      ]
    },
    {
      number: 6,
      know: { en: "God's Character", es: "El Carácter de Dios" },
      grow: { en: "Living in God's Attributes", es: "Viviendo en los Atributos de Dios" },
      centralConcept: {
        en: "God is infinite, eternal, and unchangeable in His being and attributes. He is sovereign, holy, just, merciful, loving, faithful, and wise. Understanding God's character transforms how we see ourselves, our circumstances, and our future. As we grow in our knowledge of God's attributes, we are conformed more deeply into the image of His Son, Jesus Christ, and we respond with appropriate awe, worship, and obedience.",
        es: "Dios es infinito, eterno e inmutable en Su ser y atributos. Él es soberano, santo, justo, misericordioso, amoroso, fiel y sabio. Comprender el carácter de Dios transforma cómo nos vemos a nosotros mismos, nuestras circunstancias y nuestro futuro. A medida que crecemos en nuestro conocimiento de los atributos de Dios, somos conformados más profundamente a la imagen de Su Hijo, Jesucristo, y respondemos con reverencia, adoración y obediencia apropiadas."
      },
      memoryVerses: {
        en: ["Psalm 86:5", "Nahum 1:7"],
        es: ["Salmo 86:5", "Nahúm 1:7"]
      },
      actionStep: {
        en: "God is Good (Psalm 34:8)\nReflection: Which aspect of God's character has been most real to you recently?\nAction Step: Choose one attribute of God to focus on this week. How will you intentionally grow in your understanding and appreciation of this aspect of His character?",
        es: "Dios es Bueno (Salmo 34:8)\nReflexiona: ¿Cuál aspecto del carácter de Dios ha sido más real para ti recientemente?\nAcción a Seguir: Elige un atributo de Dios en el que enfocarte esta semana. ¿Cómo crecerás intencionalmente en tu comprensión y apreciación de este aspecto de Su carácter?"
      },
      growActionStep: {
        en: "Create a personal list of God's attributes you've experienced this week. For each, write down how that attribute of God has impacted your faith or circumstances.",
        es: "Crea una lista personal de los atributos de Dios que has experimentado esta semana. Para cada uno, escribe cómo ese atributo de Dios ha impactado tu fe o circunstancias."
      },
      days: [
        {
          day: 1,
          section: "know",
          passages: [
            {
              title: { en: "Sovereignty", es: "Soberanía" },
              scripture: { en: "Psalm 103:19", es: "Salmo 103:19" },
              reflect: {
                en: "What does God's sovereignty mean for His rule over creation?",
                es: "¿Qué significa la soberanía de Dios para Su dominio sobre la creación?"
              },
              apply: {
                en: "How does God's sovereignty bring you peace in uncertain times?",
                es: "¿Cómo te trae la soberanía de Dios paz en tiempos inciertos?"
              }
            },
            {
              title: { en: "Omnipotence", es: "Omnipotencia" },
              scripture: { en: "Jeremiah 32:17", es: "Jeremías 32:17" },
              reflect: {
                en: "What is impossible for God, and what does His power mean?",
                es: "¿Qué es imposible para Dios, y qué significa Su poder?"
              },
              apply: {
                en: "How does God's infinite power give you confidence in His promises?",
                es: "¿Cómo te da confianza el poder infinito de Dios en Sus promesas?"
              }
            },
            {
              title: { en: "Omniscience", es: "Omnisciencia" },
              scripture: { en: "Psalm 139:1-2", es: "Salmo 139:1-2" },
              reflect: {
                en: "What comfort is there in God knowing everything about you?",
                es: "¿Qué consuelo hay en que Dios lo sepa todo sobre ti?"
              },
              apply: {
                en: "How does knowing God knows your thoughts affect your life?",
                es: "¿Cómo afecta tu vida el saber que Dios conoce tus pensamientos?"
              }
            }
          ]
        },
        {
          day: 2,
          section: "know",
          passages: [
            {
              title: { en: "Holiness", es: "Santidad" },
              scripture: { en: "Isaiah 6:3", es: "Isaías 6:3" },
              reflect: {
                en: "What does it mean that God is holy and set apart from creation?",
                es: "¿Qué significa que Dios sea santo y separado de la creación?"
              },
              apply: {
                en: "How should God's holiness motivate you to grow in holiness?",
                es: "¿Cómo debe la santidad de Dios motivarte a crecer en santidad?"
              }
            },
            {
              title: { en: "Purity", es: "Pureza" },
              scripture: { en: "Habakkuk 1:13", es: "Habacuc 1:13" },
              reflect: {
                en: "How can a holy God have fellowship with sinful humanity?",
                es: "¿Cómo puede un Dios santo tener comunión con la humanidad pecadora?"
              },
              apply: {
                en: "What sin needs to be confessed and forsaken in your life?",
                es: "¿Qué pecado necesita ser confesado y abandonado en tu vida?"
              }
            },
            {
              title: { en: "Transcendence", es: "Trascendencia" },
              scripture: { en: "Isaiah 55:8-9", es: "Isaías 55:8-9" },
              reflect: {
                en: "Why is God's transcendence important for understanding His nature?",
                es: "¿Por qué es importante la trascendencia de Dios para entender Su naturaleza?"
              },
              apply: {
                en: "How does God's transcendence affect how you worship Him?",
                es: "¿Cómo afecta la trascendencia de Dios la forma en que Lo adoras?"
              }
            }
          ]
        },
        {
          day: 3,
          section: "know",
          passages: [
            {
              title: { en: "Justice", es: "Justicia" },
              scripture: { en: "Deuteronomy 32:4", es: "Deuteronomio 32:4" },
              reflect: {
                en: "What does God's justice mean for how He judges?",
                es: "¿Qué significa la justicia de Dios para cómo juzga?"
              },
              apply: {
                en: "How does trusting in God's justice help you face injustice?",
                es: "¿Cómo te ayuda confiar en la justicia de Dios a enfrentar la injusticia?"
              }
            },
            {
              title: { en: "Wrath", es: "Ira" },
              scripture: { en: "Romans 1:18", es: "Romanos 1:18" },
              reflect: {
                en: "How is God's wrath against sin an expression of His character?",
                es: "¿Cómo es la ira de Dios contra el pecado una expresión de Su carácter?"
              },
              apply: {
                en: "How does understanding God's wrath deepen your gratitude for grace?",
                es: "¿Cómo profundiza tu gratitud por la gracia el entender la ira de Dios?"
              }
            },
            {
              title: { en: "Mercy", es: "Misericordia" },
              scripture: { en: "Psalm 86:5", es: "Salmo 86:5" },
              reflect: {
                en: "Why is God's mercy greater than His judgment?",
                es: "¿Por qué la misericordia de Dios es mayor que Su juicio?"
              },
              apply: {
                en: "How has God's mercy been extended to you, and how can you extend it to others?",
                es: "¿Cómo se te ha extendido la misericordia de Dios, y cómo puedes extenderla a otros?"
              }
            }
          ]
        },
        {
          day: 4,
          section: "know",
          passages: [
            {
              title: { en: "Love", es: "Amor" },
              scripture: { en: "1 John 4:8", es: "1 Juan 4:8" },
              reflect: {
                en: "What does it mean that God is love?",
                es: "¿Qué significa que Dios sea amor?"
              },
              apply: {
                en: "How does understanding God's love transform your self-image?",
                es: "¿Cómo transforma tu autoimagen el entender el amor de Dios?"
              }
            },
            {
              title: { en: "Faithfulness", es: "Fidelidad" },
              scripture: { en: "Lamentations 3:22-23", es: "Lamentaciones 3:22-23" },
              reflect: {
                en: "Why is God's faithfulness a foundation for our hope?",
                es: "¿Por qué es la fidelidad de Dios un fundamento para nuestra esperanza?"
              },
              apply: {
                en: "How has God proven His faithfulness in your life?",
                es: "¿Cómo ha probado Dios Su fidelidad en tu vida?"
              }
            },
            {
              title: { en: "Patience", es: "Paciencia" },
              scripture: { en: "2 Peter 3:9", es: "2 Pedro 3:9" },
              reflect: {
                en: "Why does God patiently endure with sinners?",
                es: "¿Por qué Dios pacientemente soporta con los pecadores?"
              },
              apply: {
                en: "How can God's patience toward you inspire patience toward others?",
                es: "¿Cómo puede la paciencia de Dios hacia ti inspirar paciencia hacia otros?"
              }
            }
          ]
        },
        {
          day: 5,
          section: "know",
          passages: [
            {
              title: { en: "Wisdom", es: "Sabiduría" },
              scripture: { en: "Proverbs 3:19-20", es: "Proverbios 3:19-20" },
              reflect: {
                en: "How does God's wisdom exceed all human understanding?",
                es: "¿Cómo la sabiduría de Dios excede todo entendimiento humano?"
              },
              apply: {
                en: "How can you seek God's wisdom instead of relying on your own?",
                es: "¿Cómo puedes buscar la sabiduría de Dios en lugar de confiar en la tuya?"
              }
            },
            {
              title: { en: "Immutability", es: "Inmutabilidad" },
              scripture: { en: "Malachi 3:6", es: "Malaquías 3:6" },
              reflect: {
                en: "Why is God's unchangingness comforting?",
                es: "¿Por qué es reconfortante que Dios sea inmutable?"
              },
              apply: {
                en: "How does God's immutability provide stability in your changing life?",
                es: "¿Cómo proporciona estabilidad la inmutabilidad de Dios en tu vida cambiante?"
              }
            },
            {
              title: { en: "Eternality", es: "Eternidad" },
              scripture: { en: "Psalm 90:2", es: "Salmo 90:2" },
              reflect: {
                en: "What does it mean that God exists outside of time?",
                es: "¿Qué significa que Dios exista fuera del tiempo?"
              },
              apply: {
                en: "How does God's eternality affect your perspective on temporary struggles?",
                es: "¿Cómo afecta la eternidad de Dios tu perspectiva sobre las luchas temporales?"
              }
            }
          ]
        },
        {
          day: 6,
          section: "grow",
          passages: [
            {
              title: { en: "Reflecting God's Attributes", es: "Reflejando los Atributos de Dios" },
              scripture: { en: "Genesis 1:27", es: "Génesis 1:27" },
              reflect: {
                en: "How are we called to reflect God's character in our lives?",
                es: "¿Cómo estamos llamados a reflejar el carácter de Dios en nuestras vidas?"
              },
              apply: {
                en: "Which attribute of God do you most need to reflect in your relationships?",
                es: "¿Cuál atributo de Dios necesitas reflejar más en tus relaciones?"
              }
            },
            {
              title: { en: "Trusting God's Goodness", es: "Confiando en la Bondad de Dios" },
              scripture: { en: "Romans 8:28", es: "Romanos 8:28" },
              reflect: {
                en: "How can we trust that God works all things for good?",
                es: "¿Cómo podemos confiar en que Dios hace que todo coopere para bien?"
              },
              apply: {
                en: "What difficult situation do you need to trust to God's goodness?",
                es: "¿Qué situación difícil necesitas confiar a la bondad de Dios?"
              }
            },
            {
              title: { en: "Worshiping God's Character", es: "Adorando el Carácter de Dios" },
              scripture: { en: "Psalm 145:1-7", es: "Salmo 145:1-7" },
              reflect: {
                en: "How does knowing God's attributes lead to worship?",
                es: "¿Cómo el conocer los atributos de Dios lleva a la adoración?"
              },
              apply: {
                en: "How will you express worship to God for His character this week?",
                es: "¿Cómo expresarás adoración a Dios por Su carácter esta semana?"
              }
            }
          ]
        }
      ]
    },
    {
      number: 7,
      know: { en: "The Church", es: "La Iglesia" },
      grow: { en: "Living as Church", es: "Viviendo como Iglesia" },
      centralConcept: {
        en: "The Church is the body of Christ—all believers united through faith in Jesus and empowered by the Holy Spirit. The Church is both local (gathered in specific communities) and universal (spanning all times and places). We are called to gather regularly, to grow in unity and maturity, to use our spiritual gifts to serve one another, and to advance God's kingdom by sharing the Gospel and making disciples. Living as the Church means belonging to one another, bearing one another's burdens, and reflecting Christ's love to a watching world.",
        es: "La Iglesia es el cuerpo de Cristo—todos los creyentes unidos por la fe en Jesús y capacitados por el Espíritu Santo. La Iglesia es tanto local (reunida en comunidades específicas) como universal (abarcando todos los tiempos y lugares). Estamos llamados a reunirnos regularmente, a crecer en unidad y madurez, a usar nuestros dones espirituales para servirnos mutuamente, y a avanzar el reino de Dios compartiendo el Evangelio y haciendo discípulos. Vivir como la Iglesia significa pertenecer los unos a los otros, llevar las cargas los unos de los otros, y reflejar el amor de Cristo a un mundo que mira."
      },
      memoryVerses: {
        en: ["1 Corinthians 12:27", "Ephesians 4:4-6"],
        es: ["1 Corintios 12:27", "Efesios 4:4-6"]
      },
      actionStep: {
        en: "One Body, Many Members (Romans 12:3-8)\nReflection: How has your local church community shaped your faith journey?\nAction Step: Identify your spiritual gifts and find a way to serve your church body this week. How will you use what God has given you to strengthen others?",
        es: "Un Cuerpo, Muchos Miembros (Romanos 12:3-8)\nReflexiona: ¿Cómo ha moldeado tu comunidad de iglesia local tu camino de fe?\nAcción a Seguir: Identifica tus dones espirituales y encuentra una manera de servir a tu cuerpo de iglesia esta semana. ¿Cómo usarás lo que Dios te ha dado para fortalecer a otros?"
      },
      growActionStep: {
        en: "This week, reach out to someone in your church community who is struggling or isolated. Share the Gospel with someone who doesn't yet know Jesus, or disciple someone in their faith journey.",
        es: "Esta semana, comunícate con alguien en tu comunidad de iglesia que está luchando o aislado. Comparte el Evangelio con alguien que aún no conoce a Jesús, o discípula a alguien en su camino de fe."
      },
      days: [
        {
          day: 1,
          section: "know",
          passages: [
            {
              title: { en: "The Body of Christ", es: "El Cuerpo de Cristo" },
              scripture: { en: "1 Corinthians 12:12-14", es: "1 Corintios 12:12-14" },
              reflect: {
                en: "What does it mean that believers together form the body of Christ?",
                es: "¿Qué significa que los creyentes juntos formen el cuerpo de Cristo?"
              },
              apply: {
                en: "How should understanding the Church as a body change your perspective on community?",
                es: "¿Cómo debe cambiar tu perspectiva de comunidad el entender que la Iglesia es un cuerpo?"
              }
            },
            {
              title: { en: "Unity of the Spirit", es: "Unidad del Espíritu" },
              scripture: { en: "Ephesians 4:4-6", es: "Efesios 4:4-6" },
              reflect: {
                en: "Why is unity among believers essential to the Church's identity?",
                es: "¿Por qué es la unidad entre creyentes esencial para la identidad de la Iglesia?"
              },
              apply: {
                en: "What can you do to promote unity in your church community?",
                es: "¿Qué puedes hacer para promover la unidad en tu comunidad de iglesia?"
              }
            },
            {
              title: { en: "Connection to Christ the Head", es: "Conexión a Cristo la Cabeza" },
              scripture: { en: "Colossians 1:18", es: "Colosenses 1:18" },
              reflect: {
                en: "Why is Christ the head of the Church, and what does that mean?",
                es: "¿Por qué Cristo es la cabeza de la Iglesia, y qué significa eso?"
              },
              apply: {
                en: "How does submitting to Christ's headship shape your church involvement?",
                es: "¿Cómo moldea tu participación en la iglesia el someterse a la dirección de Cristo?"
              }
            }
          ]
        },
        {
          day: 2,
          section: "know",
          passages: [
            {
              title: { en: "Local Church", es: "Iglesia Local" },
              scripture: { en: "Hebrews 10:24-25", es: "Hebreos 10:24-25" },
              reflect: {
                en: "Why is gathering with a local church community important?",
                es: "¿Por qué es importante reunirse con una comunidad de iglesia local?"
              },
              apply: {
                en: "How committed are you to your local church community, and why?",
                es: "¿Qué tan comprometido estás con tu comunidad de iglesia local, y por qué?"
              }
            },
            {
              title: { en: "Church Leadership", es: "Liderazgo de la Iglesia" },
              scripture: { en: "1 Timothy 3:1-7", es: "1 Timoteo 3:1-7" },
              reflect: {
                en: "What qualities should church leaders demonstrate?",
                es: "¿Qué cualidades deben demostrar los líderes de la iglesia?"
              },
              apply: {
                en: "How can you support and respect your church leaders?",
                es: "¿Cómo puedes apoyar y respetar a los líderes de tu iglesia?"
              }
            },
            {
              title: { en: "Church Discipline", es: "Disciplina de la Iglesia" },
              scripture: { en: "Matthew 18:15-17", es: "Mateo 18:15-17" },
              reflect: {
                en: "Why does the Church practice loving accountability?",
                es: "¿Por qué la Iglesia practica la rendición de cuentas amorosa?"
              },
              apply: {
                en: "How can you lovingly help others grow in righteousness?",
                es: "¿Cómo puedes ayudar amorosamente a otros a crecer en justicia?"
              }
            }
          ]
        },
        {
          day: 3,
          section: "know",
          passages: [
            {
              title: { en: "Spiritual Gifts", es: "Dones Espirituales" },
              scripture: { en: "1 Peter 4:10-11", es: "1 Pedro 4:10-11" },
              reflect: {
                en: "Why has God given spiritual gifts to every believer?",
                es: "¿Por qué Dios ha dado dones espirituales a cada creyente?"
              },
              apply: {
                en: "What spiritual gifts has God given you, and how are you using them?",
                es: "¿Qué dones espirituales te ha dado Dios, y cómo los estás usando?"
              }
            },
            {
              title: { en: "Serving One Another", es: "Sirviéndose Mutuamente" },
              scripture: { en: "Galatians 5:13", es: "Gálatas 5:13" },
              reflect: {
                en: "How does Christian freedom enable us to serve others?",
                es: "¿Cómo la libertad cristiana nos permite servir a otros?"
              },
              apply: {
                en: "What area of need in your church can you address through service?",
                es: "¿Qué área de necesidad en tu iglesia puedes abordar a través del servicio?"
              }
            },
            {
              title: { en: "Bearing Burdens", es: "Llevando Cargas" },
              scripture: { en: "Galatians 6:2", es: "Gálatas 6:2" },
              reflect: {
                en: "How do we fulfill Christ's law by bearing one another's burdens?",
                es: "¿Cómo cumplimos la ley de Cristo llevando las cargas los unos de los otros?"
              },
              apply: {
                en: "Whose burden can you help carry this week?",
                es: "¿Cuya carga puedes ayudar a llevar esta semana?"
              }
            }
          ]
        },
        {
          day: 4,
          section: "know",
          passages: [
            {
              title: { en: "Baptism", es: "Bautismo" },
              scripture: { en: "Matthew 28:19-20", es: "Mateo 28:19-20" },
              reflect: {
                en: "What does baptism represent in the life of a believer?",
                es: "¿Qué representa el bautismo en la vida de un creyente?"
              },
              apply: {
                en: "How has baptism marked your commitment to Christ and His Church?",
                es: "¿Cómo ha marcado el bautismo tu compromiso con Cristo y Su Iglesia?"
              }
            },
            {
              title: { en: "Communion", es: "Comunión" },
              scripture: { en: "1 Corinthians 11:23-26", es: "1 Corintios 11:23-26" },
              reflect: {
                en: "What is the significance of regularly partaking in communion?",
                es: "¿Cuál es la importancia de participar regularmente en la comunión?"
              },
              apply: {
                en: "How does communion deepen your worship and remembrance of Christ?",
                es: "¿Cómo profundiza la comunión tu adoración y recuerdo de Cristo?"
              }
            },
            {
              title: { en: "Witness", es: "Testimonio" },
              scripture: { en: "Acts 1:8", es: "Hechos 1:8" },
              reflect: {
                en: "How is the Church called to be a witness to the Gospel?",
                es: "¿Cómo está llamada la Iglesia a ser testigo del Evangelio?"
              },
              apply: {
                en: "How is your church community witnessing to Jesus in your neighborhood?",
                es: "¿Cómo está testificando tu comunidad de iglesia sobre Jesús en tu vecindario?"
              }
            }
          ]
        },
        {
          day: 5,
          section: "know",
          passages: [
            {
              title: { en: "Making Disciples", es: "Haciendo Discípulos" },
              scripture: { en: "Matthew 28:19-20", es: "Mateo 28:19-20" },
              reflect: {
                en: "Why is discipleship central to the Church's mission?",
                es: "¿Por qué es el discipulado central para la misión de la Iglesia?"
              },
              apply: {
                en: "Who is God calling you to disciple, and how will you do it?",
                es: "¿A quién te está llamando Dios a discipular, y cómo lo harás?"
              }
            },
            {
              title: { en: "Gospel Proclamation", es: "Proclamación del Evangelio" },
              scripture: { en: "1 Corinthians 15:1-4", es: "1 Corintios 15:1-4" },
              reflect: {
                en: "What is the core of the Gospel message the Church proclaims?",
                es: "¿Cuál es el núcleo del mensaje del Evangelio que proclama la Iglesia?"
              },
              apply: {
                en: "How are you learning to articulate and share the Gospel?",
                es: "¿Cómo estás aprendiendo a articular y compartir el Evangelio?"
              }
            },
            {
              title: { en: "Kingdom Advancement", es: "Avance del Reino" },
              scripture: { en: "Matthew 6:33", es: "Mateo 6:33" },
              reflect: {
                en: "How does the Church advance God's kingdom on earth?",
                es: "¿Cómo avanza la Iglesia el reino de Dios en la tierra?"
              },
              apply: {
                en: "What priority are you giving to seeking God's kingdom in your life?",
                es: "¿Qué prioridad le das a buscar el reino de Dios en tu vida?"
              }
            }
          ]
        },
        {
          day: 6,
          section: "grow",
          passages: [
            {
              title: { en: "Caring for the Weak", es: "Cuidando a los Débiles" },
              scripture: { en: "Romans 15:1-3", es: "Romanos 15:1-3" },
              reflect: {
                en: "How are the strong called to help the weak in the Church?",
                es: "¿Cómo se llama a los fuertes a ayudar a los débiles en la Iglesia?"
              },
              apply: {
                en: "Who in your church community needs your support and care?",
                es: "¿Quién en tu comunidad de iglesia necesita tu apoyo y cuidado?"
              }
            },
            {
              title: { en: "Pursuing Peace and Purity", es: "Persiguiendo la Paz y la Pureza" },
              scripture: { en: "Hebrews 12:14", es: "Hebreos 12:14" },
              reflect: {
                en: "How do we pursue peace and holiness within the Church community?",
                es: "¿Cómo perseguimos la paz y la santidad dentro de la comunidad de la Iglesia?"
              },
              apply: {
                en: "Where can you work for peace and pursue holiness this week?",
                es: "¿Dónde puedes trabajar por la paz y perseguir la santidad esta semana?"
              }
            },
            {
              title: { en: "Living as Believers Together", es: "Viviendo como Creyentes Juntos" },
              scripture: { en: "Acts 2:42-47", es: "Hechos 2:42-47" },
              reflect: {
                en: "What characterized the early Church's life together?",
                es: "¿Qué caracterizaba la vida juntos de la iglesia primitiva?"
              },
              apply: {
                en: "How can your church community cultivate deeper fellowship and community?",
                es: "¿Cómo puede tu comunidad de iglesia cultivar una comunión y comunidad más profunda?"
              }
            }
          ]
        }
      ]
    }
  ]
};
