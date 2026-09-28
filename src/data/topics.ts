export interface Topic { id: string; title: string; description: string; words: string[] }
export const TOPICS: Topic[] = [
  {
    "id": "kitchen",
    "title": "居家与饮食",
    "description": "Home and food",
    "words": [
      "cocina",
      "cocinero",
      "cocinar",
      "beber",
      "tener",
      "pequeño",
      "útil",
      "agua",
      "pan",
      "mesa",
      "ventana",
      "habitación",
      "limpiar",
      "limpio",
      "limpieza",
      "comer",
      "comprar",
      "compra"
    ]
  },
  {
    "id": "ideas",
    "title": "交流与想法",
    "description": "Communication and ideas",
    "words": [
      "decisión",
      "rápidamente",
      "aunque",
      "pregunta",
      "respuesta",
      "hablar",
      "escuchar",
      "responder",
      "comprender",
      "alguien",
      "nadie",
      "cualquiera",
      "mientras",
      "para que",
      "sin embargo",
      "de acuerdo"
    ]
  },
  {
    "id": "learning",
    "title": "学习与工作",
    "description": "Learning and work",
    "words": [
      "estudiar",
      "estudiante",
      "estudio",
      "aprender",
      "aprendizaje",
      "trabajar",
      "trabajo",
      "trabajador",
      "libro",
      "reunión",
      "solicitud",
      "oportunidad",
      "esfuerzo",
      "responsable",
      "disponible",
      "compartir",
      "compartido"
    ]
  },
  {
    "id": "daily",
    "title": "日常出行",
    "description": "Daily routines and travel",
    "words": [
      "viajar",
      "viaje",
      "viajero",
      "caminar",
      "correr",
      "ir",
      "vivir",
      "vida",
      "vivo",
      "ciudad",
      "jardín",
      "tiempo",
      "hoy",
      "mañana",
      "aquí",
      "siempre",
      "nunca",
      "despacio",
      "hacia",
      "durante",
      "dormir"
    ]
  }
];
export function getTopicById(id: string) { return TOPICS.find(t => t.id === id); }
