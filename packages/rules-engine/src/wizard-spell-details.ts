/** Catálogo de consultas de juego: resumen ORIGINAL en español, PHB 2024 pp. 239-343.
 * Los textos no sustituyen las redacciones completas del manual; la ficha indica
 * fuentes y datos verificados. Dados a nivel base, sin adjudicar efectos.
 */
import {WIZARD_LEVEL_ONE_CANTRIPS,WIZARD_SPELL_CATALOG} from './wizard-creation';
import {WIZARD_LEVEL_THREE_SPELLS} from './wizard-third-level';
import {WIZARD_LEVEL_FOUR_SPELLS} from './wizard-fourth-level';
import {WIZARD_LEVEL_FIVE_SPELLS} from './wizard-fifth-level';
import {WIZARD_LEVEL_SIX_SPELLS} from './wizard-sixth-level';
export type SpellDice=Readonly<{label:string;formula:string;scales?:boolean}>;
export type WizardSpellRule=Readonly<{id:string;name:string;level:number;school:string;ritual?:boolean;description:string;castingTime?:string;range?:string;components?:string;duration?:string;sourcePage?:number;attack:boolean;rolls:readonly SpellDice[];cantripScales:boolean}>;
const descriptions:Record<string,string>={
 "acid_splash": "Creas una burbuja ácida que explota en una esfera de 5 pies de radio centrada en un punto a 60 pies como máximo. Cada criatura en la zona realiza salvación de Destreza; si falla recibe 1d6 de daño ácido. Aumenta a 2d6/3d6/4d6 en los niveles de personaje 5/11/17.",
 "blade_ward": "Mediante concentración te proteges durante un minuto. Los ataques contra ti sufren una penalización de 1d4 mientras el efecto permanezca activo.",
 "chill_touch": "Ataque mágico cuerpo a cuerpo contra una criatura tocada. Inflige daño necrótico y el objetivo no puede recuperar puntos de golpe hasta el comienzo de tu próximo turno; los no muertos también tienen desventaja al atacarte durante ese intervalo.",
 "dancing_lights": "Creas hasta cuatro luces pequeñas, o una figura luminosa, dentro del alcance. Puedes moverlas mediante acción adicional mientras mantienes la concentración; cada luz ilumina débilmente su entorno.",
 "elementalism": "Manipulas una pequeña cantidad de aire, tierra, fuego o agua de forma inofensiva: una ráfaga, polvo, una llama o una forma de agua. No es un conjuro de daño.",
 "fire_bolt": "Realizas un ataque mágico a distancia contra una criatura u objeto. Inflige daño de fuego y puede prender objetos inflamables que no se lleven puestos.",
 "friends": "Intentas influir temporalmente en una criatura humanoide que puedas ver a corta distancia. Requiere concentración, y el objetivo puede intentar resistir el efecto con una salvación de Sabiduría; la relación posterior no está garantizada.",
 "light": "Tocas un objeto y haces que emita luz intensa con un halo de luz tenue durante una hora. Puedes cubrir la fuente; lanzar el conjuro sobre un objeto que porta otra criatura puede requerir salvación.",
 "mage_hand": "Creas una mano espectral que puede manipular objetos, abrir contenedores sin cerrar y transportar objetos ligeros. No puede atacar, activar objetos mágicos ni cargar más peso del permitido.",
 "mending": "Reparas una única rotura o desgarro de un objeto al que tocas, siempre que encaje en los límites del conjuro. No devuelve capacidades mágicas perdidas.",
 "message": "Envías un mensaje susurrado a una criatura a distancia y esta puede responder en voz baja. Determinadas barreras bloquean el efecto y debe existir un recorrido posible hacia el objetivo.",
 "mind_sliver": "Una criatura a distancia realiza una salvación de Inteligencia. Si falla sufre daño psíquico y resta 1d4 a la siguiente salvación que haga antes del final de tu siguiente turno.",
 "minor_illusion": "Creas una imagen inmóvil o un sonido ilusorio durante un minuto. No produce un efecto físico; interactuar con la ilusión o examinarla puede revelar que es falsa.",
 "poison_spray": "Rocías a una criatura que puedas ver a corta distancia. Una salvación de Constitución determina si sufre daño de veneno.",
 "prestidigitation": "Realizas pequeños trucos mágicos inocuos: limpiar o ensuciar, alterar sabores o temperaturas, crear un efecto sensorial, encender o apagar una llama pequeña o marcar un objeto.",
 "ray_of_frost": "Ataque mágico a distancia que inflige daño de frío. Si impacta, reduce temporalmente la velocidad del objetivo hasta tu siguiente turno.",
 "shocking_grasp": "Ataque mágico cuerpo a cuerpo que inflige daño de relámpago. Si impacta, impide al objetivo realizar ataques de oportunidad hasta su siguiente turno.",
 "thunderclap": "Creas un estallido sonoro audible a gran distancia. Las criaturas cercanas que fallen una salvación de Constitución reciben daño de trueno.",
 "toll_the_dead": "Señalas una criatura a distancia y haces sonar una campana fúnebre. Con una salvación de Sabiduría fallida recibe daño necrótico, mayor si ya le faltan puntos de golpe.",
 "true_strike": "Al atacar con un arma como parte del conjuro, puedes usar la característica mágica para el ataque y el daño. El daño puede convertirse en radiante y se incrementa con el nivel del personaje.",
 "alarm": "Proteges una puerta, ventana o zona contra intrusos durante varias horas. Al prepararlo eliges criaturas ignoradas y si la alarma se manifiesta de forma audible o mental; puede lanzarse como ritual.",
 "burning_hands": "Un cono de fuego sale de tus manos y obliga a las criaturas de la zona a realizar una salvación de Destreza. Si la superan reciben la mitad del daño; los objetos inflamables pueden prender.",
 "charm_person": "Intentas hechizar a un humanoide visible. Hace una salvación de Sabiduría con ventaja si está combatiendo contigo; al terminar sabe que lo hechizaste.",
 "chromatic_orb": "Ataque mágico a distancia que impacta con una esfera de ácido, frío, fuego, relámpago, veneno o trueno. Puede saltar a otro objetivo cuando los dados de daño muestran suficientes resultados iguales, siguiendo los límites del conjuro.",
 "color_spray": "Un abanico de colores brillantes afecta a criaturas dentro de un cono. Las que fallen su salvación de Constitución quedan cegadas brevemente.",
 "comprehend_languages": "Entiendes el significado literal de lenguas habladas que escuches y textos que toques. No descifras mensajes secretos ni escrituras codificadas; admite ritual.",
 "detect_magic": "Durante la concentración percibes la presencia de magia cercana y puedes distinguir sus auras y escuelas en criaturas u objetos visibles. Algunas barreras bloquean la detección; admite ritual.",
 "disguise_self": "Modificas ilusoriamente tu apariencia y la de tu ropa o equipo durante una hora. El disfraz no soporta una inspección física y puede descubrirse mediante una prueba apropiada.",
 "expeditious_retreat": "Lanzamiento con acción adicional. Mientras mantienes la concentración puedes usar Esprintar como acción adicional y mejorar tu movilidad.",
 "false_life": "Obtienes puntos de golpe temporales durante un periodo prolongado. No se acumulan con otros PG temporales: eliges cuál conjunto conservar.",
 "feather_fall": "Reacción cuando tú u otras criaturas cercanas comenzáis a caer. Reduce notablemente la velocidad de caída y permite aterrizar sin daño si dura hasta tocar el suelo.",
 "find_familiar": "Invocas un familiar espiritual con forma animal. Actúa con su propio turno, se comunica contigo y puede entregar conjuros de toque según las reglas; no puede atacar. Ritual con componente costoso.",
 "fog_cloud": "Creas una esfera de niebla intensamente oscurecida que dificulta la visión. Puedes mantenerla mediante concentración y los vientos fuertes pueden dispersarla.",
 "grease": "Cubres una zona de suelo de grasa resbaladiza durante un minuto. Las criaturas que entren o permanezcan en la zona pueden caer derribadas si fallan una salvación de Destreza.",
 "ice_knife": "Ataque mágico a distancia que causa daño perforante a un objetivo. Después el proyectil estalla; el objetivo y las criaturas cercanas deben salvarse contra el daño de frío adicional.",
 "identify": "Tocas un objeto o criatura para descubrir propiedades de un objeto mágico o conjuros activos según los límites del conjuro. Requiere una perla como componente material y admite ritual.",
 "illusory_script": "Escribes un mensaje que parece diferente o incomprensible para criaturas no autorizadas. Dura varios días y requiere tinta especial consumida; admite ritual.",
 "jump": "Mediante acción adicional, tocas una criatura y mejoras sus saltos durante un minuto según las reglas del conjuro.",
 "longstrider": "Aumenta la velocidad de la criatura tocada durante una hora. No exige concentración y admite varios objetivos con ranuras superiores.",
 "mage_armor": "Proteges a una criatura sin armadura: su CA base se convierte en 13 + modificador de Destreza durante ocho horas. Termina al ponerse armadura.",
 "magic_missile": "Creas tres dardos de fuerza que impactan automáticamente a objetivos que puedas ver, salvo defensas específicas. Cada dardo hace su propio daño de fuerza; con ranuras mayores hay más dardos.",
 "protection_from_evil_and_good": "Proteges por concentración a una criatura contra ciertos tipos sobrenaturales. Esos adversarios tienen desventaja al atacarla y no pueden poseerla ni causarle determinados estados, con excepciones indicadas en la regla.",
 "ray_of_sickness": "Realizas un ataque mágico a distancia. Si impactas, el objetivo recibe daño de veneno y queda Envenenado hasta el final de tu siguiente turno, sin salvación adicional.",
 "shield": "Reacción al recibir un ataque o ser objetivo de Proyectil mágico. Obtienes +5 a la CA hasta el comienzo de tu siguiente turno y bloqueas los proyectiles mágicos según las reglas.",
 "silent_image": "Creas la ilusión visual de un objeto, criatura o fenómeno dentro de un área. Puedes moverla con una acción y mantenerla mediante concentración; el tacto revela que no es real.",
 "sleep": "Afecta a las criaturas elegidas en una esfera de 5 pies de radio. Si fallan la salvación de Sabiduría quedan Incapacitadas hasta el final de su siguiente turno; si vuelven a fallar quedan Inconscientes mientras dure la concentración. Despertar con daño o mediante una acción interrumpe el efecto; existen inmunidades.",
 "tashas_hideous_laughter": "Una criatura con capacidad de reír realiza una salvación de Sabiduría. Si falla cae presa de una risa incontrolable con sus efectos sobre el movimiento y las acciones; puede repetir salvaciones según la regla.",
 "tensers_floating_disk": "Creas un disco de fuerza flotante que transporta objetos hasta su capacidad máxima y te sigue a distancia. No puede salvar desniveles elevados ni realizar acciones por sí mismo; ritual.",
 "thunderwave": "Una onda de trueno afecta a una zona cúbica originada en ti. Salvación de Constitución para reducir el daño; puede empujar criaturas y objetos, y suena a gran distancia.",
 "unseen_servant": "Creas un sirviente invisible y sin voluntad que puede realizar tareas sencillas bajo tus órdenes. Tiene límites estrictos de fuerza, distancia y combate; admite ritual.",
 "witch_bolt": "Realizas un ataque mágico a distancia: si impacta, causa 2d12 de daño de relámpago. Mientras mantengas la concentración puedes causar 1d12 de daño adicional con una acción adicional cada turno, incluso si el ataque inicial falló. Termina si el objetivo sale de alcance o gana cobertura total.",
 "alter_self": "Mediante concentración alteras tu cuerpo: adaptación acuática, cambio de apariencia o armas naturales. Puedes cambiar la modalidad mientras dura el conjuro.",
 "arcane_lock": "Cierras mágicamente una puerta, ventana, cofre o entrada tocada hasta que se disipe el efecto. Puedes establecer contraseñas y autorizados; exige material de oro consumido.",
 "arcane_vigor": "Mediante una acción adicional gastas uno o dos dados de golpe que aún conserves. Recuperas tantos PG como la suma de los dados tirados más tu modificador de la característica para lanzar conjuros (Inteligencia si eres Mago). Los dados quedan gastados; con ranuras superiores puedes usar más dados.",
 "augury": "Consulta presagios sobre una acción concreta que planeas realizar pronto. La respuesta es favorable, desfavorable, mixta o incierta; múltiples usos alteran su fiabilidad. Ritual.",
 "blindness_deafness": "Una criatura a distancia realiza una salvación de Constitución. Si falla queda Cegada o Ensordecida, según lo elegido, y puede volver a salvarse al final de cada turno.",
 "blur": "Concentración que hace tu imagen borrosa. Los ataques contra ti tienen desventaja salvo cuando el atacante te percibe con sentidos que ignoren este efecto.",
 "cloud_of_daggers": "Creas una zona pequeña llena de cuchillas giratorias, mantenida por concentración. Una criatura recibe daño cortante al entrar en el área o permanecer en ella en los momentos especificados.",
 "continual_flame": "Creas una llama ilusoria de luz sobre un objeto. No desprende calor ni consume combustible; puede extinguirse por disipación y requiere material costoso consumido.",
 "crown_of_madness": "Una criatura humanoide que falle una salvación de Sabiduría queda hechizada y puede verse obligada a atacar a otras criaturas cercanas. Requiere concentración y atención continuada del lanzador.",
 "darkness": "Creas una esfera de oscuridad mágica que bloquea la visión ordinaria y parte de la visión en la oscuridad. Puedes centrarla en un objeto; requiere concentración.",
 "darkvision": "Una criatura tocada obtiene visión en la oscuridad a una distancia indicada por el conjuro durante ocho horas, sin concentración.",
 "detect_thoughts": "Concentración para leer pensamientos superficiales de criaturas cercanas o sondear más profundamente, con salvaciones y consecuencias. También puedes localizar mentes bajo condiciones concretas.",
 "dragons_breath": "Una criatura tocada recibe, durante la concentración, la capacidad de exhalar un cono de daño elemental elegido. La exhalación obliga a salvaciones y puede repetirse según la regla.",
 "enhance_ability": "Tocas una criatura y, mediante concentración, le concedes ventaja en pruebas de una característica elegida. En niveles superiores puedes afectar a más objetivos.",
 "enlarge_reduce": "Aumenta o reduce una criatura u objeto por concentración, alterando tamaño, peso, pruebas de Fuerza y el daño de armas. Los objetivos involuntarios pueden salvarse.",
 "flaming_sphere": "Creas una esfera de fuego que puedes desplazar mediante acción adicional mientras concentras. Produce daño a criaturas cercanas y al embestir; pueden salvarse para reducirlo.",
 "gentle_repose": "Proteges un cadáver contra la descomposición y la conversión en no muerto. El tiempo protegido no cuenta para ciertos límites de resurrección; admite ritual.",
 "gust_of_wind": "Una línea de viento intenso surge desde ti mientras concentras. Dificulta el movimiento hacia ti, puede empujar criaturas y dispersar gases o vapores.",
 "hold_person": "Un humanoide que falle una salvación de Sabiduría queda Paralizado. Repite salvación al final de cada turno; concentración hasta un minuto.",
 "invisibility": "Una criatura tocada queda Invisible mientras mantienes la concentración. El conjuro termina anticipadamente si realiza determinadas acciones ofensivas o lanza un conjuro.",
 "knock": "Abres una cerradura u otro cierre no mágico o suspendes temporalmente una cerradura mágica dentro de los límites de la regla. Produce un ruido audible a gran distancia.",
 "levitate": "Elevas a una criatura u objeto verticalmente mediante concentración. Los objetivos que no quieran pueden salvarse; el movimiento horizontal requiere apoyo.",
 "locate_object": "Concentración para detectar la dirección de un objeto conocido o un tipo de objeto dentro del alcance. Plomo y otros obstáculos específicos bloquean la búsqueda.",
 "magic_mouth": "Impones a un objeto un mensaje mágico que se reproduce cuando ocurre un desencadenante perceptible. Permanece hasta disiparse y consume jade; admite ritual.",
 "magic_weapon": "Una arma no mágica tocada recibe un bonificador temporal a ataque y daño y pasa a ser mágica. No requiere concentración en su versión de 2024; los niveles mayores aumentan el bono.",
 "melfs_acid_arrow": "Un proyectil ácido requiere un ataque mágico a distancia. Inflige daño ácido inicial y otro al final del siguiente turno del objetivo; parte del daño puede aplicarse aunque el ataque falle.",
 "mind_spike": "Una criatura visible realiza salvación de Sabiduría y puede sufrir daño psíquico. Al mantener concentración puedes seguir su posición durante el tiempo indicado, aunque se oculte.",
 "mirror_image": "Creas tres duplicados que se mueven contigo durante un minuto sin concentración. Cada vez que un ataque te impacta, tiras 1d6 por cada duplicado restante; si cualquiera muestra 3 o más, el ataque destruye un duplicado en vez de dañarte. Las criaturas con Visión verdadera, Visión ciega o Cegadas no se ven engañadas.",
 "misty_step": "Acción adicional: te teletransportas a un espacio desocupado que puedas ver dentro del alcance, llevándote el equipo que portes.",
 "nystuls_magic_aura": "Alteras el aura mágica de un objetivo para engañar efectos de detección y determinadas comprobaciones mágicas. Puede mantenerse a largo plazo renovándolo.",
 "phantasmal_force": "Una criatura que falle salvación de Inteligencia percibe un fenómeno ilusorio solo para ella. Puede reaccionar a él y sufrir efectos psíquicos mientras el lanzador concentre; examinarlo permite descubrirlo.",
 "ray_of_enfeeblement": "Una criatura realiza una salvación de Constitución. Si la supera, tiene desventaja en su próximo ataque antes del inicio de tu siguiente turno; si falla, tiene desventaja en pruebas d20 basadas en Fuerza y resta 1d8 a sus tiradas de daño durante la concentración. Repite la salvación al final de cada turno.",
 "rope_trick": "Una cuerda crea una entrada hacia un pequeño espacio extradimensional que puede alojar criaturas. Desde fuera la entrada es difícil de percibir y lo que está dentro no puede atacar a través de ella.",
 "scorching_ray": "Disparas tres rayos de fuego con ataques mágicos a distancia separados. Puedes distribuirlos entre varios objetivos; cada impacto inflige daño de fuego.",
 "see_invisibility": "Durante una hora puedes ver criaturas y objetos invisibles como si fueran visibles y percibir el Plano Etéreo en un alcance limitado.",
 "shatter": "Estallido ensordecedor en una esfera a distancia. Salvación de Constitución para reducir daño de trueno; ciertos materiales tienen desventaja y los objetos pueden dañarse.",
 "spider_climb": "Una criatura tocada puede desplazarse por paredes y techos sin usar las manos mientras mantienes concentración.",
 "suggestion": "Implantas una instrucción razonable a una criatura que pueda oírte y comprenderte. Si falla la salvación de Sabiduría intentará cumplirla, con límites de daño evidente y concentración.",
 "web": "Llenas un área de redes pegajosas mediante concentración. Puede quedar Restringida una criatura que falle salvación de Destreza y usar una prueba de Fuerza para liberarse; es inflamable."
};
const dice:Record<string,readonly SpellDice[]>={
 "acid_splash": [
  {
   "label": "Daño ácido",
   "formula": "1d6"
  }
 ],
 "chill_touch": [
  {
   "label": "Daño necrótico",
   "formula": "1d10"
  }
 ],
 "fire_bolt": [
  {
   "label": "Daño de fuego",
   "formula": "1d10"
  }
 ],
 "mind_sliver": [
  {
   "label": "Daño psíquico",
   "formula": "1d6"
  },
  {
   "label": "Penalización a salvación",
   "formula": "1d4",
   "scales": false
  }
 ],
 "poison_spray": [
  {
   "label": "Daño de veneno",
   "formula": "1d12"
  }
 ],
 "ray_of_frost": [
  {
   "label": "Daño de frío",
   "formula": "1d8"
  }
 ],
 "shocking_grasp": [
  {
   "label": "Daño de relámpago",
   "formula": "1d8"
  }
 ],
 "thunderclap": [
  {
   "label": "Daño de trueno",
   "formula": "1d6"
  }
 ],
 "toll_the_dead": [
  {
   "label": "Daño base",
   "formula": "1d8"
  },
  {
   "label": "Daño con PG perdidos",
   "formula": "1d12"
  }
 ],
 "blade_ward": [
  {
   "label": "Penalización a ataques",
   "formula": "1d4"
  }
 ],
 "burning_hands": [
  {
   "label": "Daño de fuego",
   "formula": "3d6"
  }
 ],
 "chromatic_orb": [
  {
   "label": "Daño elemental",
   "formula": "3d8"
  }
 ],
 "false_life": [
  {
   "label": "PG temporales",
   "formula": "2d4+4"
  }
 ],
 "ice_knife": [
  {
   "label": "Impacto perforante",
   "formula": "1d10"
  },
  {
   "label": "Explosión de frío",
   "formula": "2d6"
  }
 ],
 "magic_missile": [
  {
   "label": "Daño de un dardo",
   "formula": "1d4+1"
  }
 ],
 "ray_of_sickness": [
  {
   "label": "Daño de veneno",
   "formula": "2d8"
  }
 ],
 "thunderwave": [
  {
   "label": "Daño de trueno",
   "formula": "2d8"
  }
 ],
 "witch_bolt": [
  {
   "label": "Impacto de relámpago",
   "formula": "2d12"
  },
  {
   "label": "Daño posterior",
   "formula": "1d12"
  }
 ],
 "cloud_of_daggers": [
  {
   "label": "Daño cortante",
   "formula": "4d4"
  }
 ],
 "dragons_breath": [
  {
   "label": "Daño elemental",
   "formula": "3d6"
  }
 ],
 "enlarge_reduce": [
  {
   "label": "Daño adicional de arma",
   "formula": "1d4"
  }
 ],
 "flaming_sphere": [
  {
   "label": "Daño de fuego",
   "formula": "2d6"
  }
 ],
 "melfs_acid_arrow": [
  {
   "label": "Impacto ácido",
   "formula": "4d4"
  },
  {
   "label": "Daño posterior",
   "formula": "2d4"
  }
 ],
 "mind_spike": [
  {
   "label": "Daño psíquico",
   "formula": "3d8"
  }
 ],
 "scorching_ray": [
  {
   "label": "Daño de un rayo",
   "formula": "2d6"
  }
 ],
 "phantasmal_force": [
  {
   "label": "Daño psíquico",
   "formula": "2d8"
  }
 ],
 "mirror_image": [
  {
   "label": "Tirar un duplicado",
   "formula": "1d6"
  }
 ],
 "ray_of_enfeeblement": [
  {
   "label": "Penalización al daño",
   "formula": "1d8"
  }
 ],
 "arcane_vigor": [
  {
   "label": "Usar un dado de golpe",
   "formula": "1d6"
  },
  {
   "label": "Usar dos dados de golpe",
   "formula": "2d6"
  }
 ],
 "shatter": [
  {
   "label": "Daño de trueno",
   "formula": "3d8"
  }
 ]
};
const attacks=new Set(["chill_touch", "chromatic_orb", "fire_bolt", "ice_knife", "melfs_acid_arrow", "ray_of_frost", "ray_of_sickness", "scorching_ray", "shocking_grasp", "witch_bolt"]);
const scaling=new Set(["acid_splash", "chill_touch", "fire_bolt", "mind_sliver", "poison_spray", "ray_of_frost", "shocking_grasp", "thunderclap", "toll_the_dead"]);
const source:Record<string,Partial<WizardSpellRule>>={
 "acid_splash": {
  "sourcePage": 239,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "blade_ward": {
  "sourcePage": 247,
  "castingTime": "Action",
  "range": "Self",
  "components": "V, S",
  "duration": "Concentration, up to 1 minute"
 },
 "chill_touch": {
  "sourcePage": 249,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "dancing_lights": {
  "sourcePage": 259,
  "castingTime": "Action",
  "range": "120 feet",
  "components": "V, S, M (a bit of phosphorus)",
  "duration": "Concentration, up to 1 minute"
 },
 "elementalism": {
  "sourcePage": 267,
  "castingTime": "Action",
  "range": "30 feet",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "fire_bolt": {
  "sourcePage": 274,
  "castingTime": "Action",
  "range": "120 feet",
  "components": "V, S"
 },
 "friends": {
  "sourcePage": 277,
  "castingTime": "Action",
  "range": "10 feet",
  "components": "S, M (some makeup)",
  "duration": "Concentration, up to 1 minute"
 },
 "light": {
  "sourcePage": 292,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, M (a firefly or phosphorescent moss)",
  "duration": "1 hour"
 },
 "mage_hand": {
  "sourcePage": 293,
  "castingTime": "Action",
  "range": "30 feet",
  "components": "V, S",
  "duration": "1 minute"
 },
 "mending": {
  "sourcePage": 297,
  "castingTime": "1 minute",
  "range": "Touch",
  "components": "V, S, M (two lodestones)",
  "duration": "Instantaneous"
 },
 "message": {
  "sourcePage": 298,
  "castingTime": "Action",
  "range": "120 feet",
  "components": "S, M (a copper wire)",
  "duration": "1 round"
 },
 "mind_sliver": {
  "sourcePage": 298,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V",
  "duration": "1 round"
 },
 "minor_illusion": {
  "sourcePage": 298,
  "castingTime": "Action",
  "range": "30 feet",
  "components": "S, M (a bit of fleece)",
  "duration": "1 minute"
 },
 "poison_spray": {
  "sourcePage": 306,
  "castingTime": "Action",
  "range": "30 feet",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "prestidigitation": {
  "sourcePage": 307,
  "castingTime": "Action",
  "range": "10 feet",
  "components": "V, S",
  "duration": "Up to 1 hour"
 },
 "ray_of_frost": {
  "sourcePage": 311,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "shocking_grasp": {
  "sourcePage": 316,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "thunderclap": {
  "sourcePage": 333,
  "castingTime": "Action",
  "range": "Self",
  "components": "S",
  "duration": "Instantaneous"
 },
 "toll_the_dead": {
  "sourcePage": 334,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "true_strike": {
  "sourcePage": 336,
  "castingTime": "Action",
  "range": "Self",
  "components": "S, M (arma con la que seas competente, valor mínimo 1 pc)",
  "duration": "Instantaneous"
 },
 "alarm": {
  "sourcePage": 239,
  "castingTime": "1 minute or Ritual",
  "range": "30 feet",
  "components": "V, S, M (a bell and silver wire)",
  "duration": "8 hours"
 },
 "burning_hands": {
  "sourcePage": 248,
  "castingTime": "Action",
  "range": "Self",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "charm_person": {
  "sourcePage": 249,
  "castingTime": "Action",
  "range": "30 feet",
  "components": "V, S",
  "duration": "1 hour"
 },
 "chromatic_orb": {
  "sourcePage": 249,
  "castingTime": "Action",
  "range": "90 feet",
  "components": "V, S, M (a diamond worth 50+ GP)",
  "duration": "Instantaneous"
 },
 "color_spray": {
  "sourcePage": 251,
  "castingTime": "Action",
  "range": "Self",
  "components": "V, S, M (a pinch of colorful sand)",
  "duration": "Instantaneous"
 },
 "comprehend_languages": {
  "sourcePage": 252,
  "castingTime": "Action or Ritual",
  "range": "Self",
  "components": "V, S, M (a pinch of soot and salt)",
  "duration": "1 hour"
 },
 "detect_magic": {
  "sourcePage": 262,
  "castingTime": "Action or Ritual",
  "range": "Self",
  "components": "V, S",
  "duration": "Concentration, up to 10 minutes"
 },
 "disguise_self": {
  "sourcePage": 262,
  "castingTime": "Action",
  "range": "Self",
  "components": "V, S",
  "duration": "1 hour"
 },
 "expeditious_retreat": {
  "sourcePage": 270,
  "castingTime": "Bonus Action",
  "range": "Self",
  "components": "V, S",
  "duration": "Concentration, up to 10 minutes"
 },
 "false_life": {
  "sourcePage": 271,
  "castingTime": "Action",
  "range": "Self",
  "components": "V, S, M (a drop of alcohol)",
  "duration": "Instantaneous"
 },
 "feather_fall": {
  "sourcePage": 271,
  "castingTime": "Reaction, which you take when you or a",
  "range": "60 feet",
  "components": "V, M (a small feather or piece of down)",
  "duration": "1 minute"
 },
 "find_familiar": {
  "sourcePage": 272,
  "castingTime": "1 hour or Ritual",
  "range": "10 feet",
  "components": "V, S, M (incienso de 10+ po; se consume)",
  "duration": "Instantaneous"
 },
 "fog_cloud": {
  "sourcePage": 276,
  "castingTime": "Action",
  "range": "120 feet",
  "components": "V, S",
  "duration": "Concentration, up to 1 hour"
 },
 "grease": {
  "sourcePage": 280,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S, M (a bit of pork rind or butter)",
  "duration": "1 minute"
 },
 "ice_knife": {
  "sourcePage": 287,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "S, M (a drop of water or a piece of ice)",
  "duration": "Instan taneous"
 },
 "identify": {
  "sourcePage": 287,
  "castingTime": "1 minute or Ritual",
  "range": "Touch",
  "components": "V, S, M (a pearl worth 100+ GP)",
  "duration": "Instantaneous"
 },
 "illusory_script": {
  "sourcePage": 288,
  "castingTime": "1 minute or Ritual",
  "range": "Touch",
  "components": "S, M (tinta de 10+ po; se consume)",
  "duration": "10 days"
 },
 "jump": {
  "sourcePage": 290,
  "castingTime": "Bonus Action",
  "range": "Touch",
  "components": "V, S, M (a grasshopper's hind leg)",
  "duration": "1 minute"
 },
 "longstrider": {
  "sourcePage": 293,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S, M (a pinch of dirt)",
  "duration": "1 hour"
 },
 "mage_armor": {
  "sourcePage": 293,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S, M (a piece of cured leather)",
  "duration": "8 hours"
 },
 "magic_missile": {
  "sourcePage": 295,
  "castingTime": "Action",
  "range": "120 feet",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "protection_from_evil_and_good": {
  "sourcePage": 309,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S, M (agua bendita por valor de 25+ po; se consume)",
  "duration": "Concentration up to 10 minutes"
 },
 "ray_of_sickness": {
  "sourcePage": 311,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "shield": {
  "sourcePage": 316,
  "castingTime": "Reaction, which you take when you are",
  "range": "Self",
  "components": "V, S",
  "duration": "1 round"
 },
 "silent_image": {
  "sourcePage": 317,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S, M (a bit of fleece)",
  "duration": "Concentration, up to 10 minutes"
 },
 "sleep": {
  "sourcePage": 317,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S, M (a pinch of sand or rose petals)",
  "duration": "Concentration, up to 1 minute"
 },
 "tashas_hideous_laughter": {
  "sourcePage": 331,
  "castingTime": "Action",
  "range": "30 feet",
  "components": "V, S, M (a tart and a feather)",
  "duration": "Concentration , up to 1 minute"
 },
 "tensers_floating_disk": {
  "sourcePage": 332,
  "castingTime": "Action or Ritual",
  "range": "30 feet",
  "components": "V, S, M (a drop of mercury)",
  "duration": "1 hour"
 },
 "thunderwave": {
  "sourcePage": 334,
  "castingTime": "Action",
  "range": "Self",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "unseen_servant": {
  "sourcePage": 336,
  "castingTime": "Action or Ritual",
  "range": "60 feet",
  "components": "V, S, M (a bit of string and of wood)",
  "duration": "1 hour"
 },
 "witch_bolt": {
  "sourcePage": 343,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S, M (a twig struck by lightning)",
  "duration": "Concentration, up to 1 minute"
 },
 "alter_self": {
  "sourcePage": 239,
  "castingTime": "Action",
  "range": "Self",
  "components": "V, S",
  "duration": "Concentration, up to 1 hour"
 },
 "arcane_lock": {
  "sourcePage": 242,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S, M (polvo de oro de 25+ po; se consume)",
  "duration": "Until dispelled"
 },
 "arcane_vigor": {
  "sourcePage": 242,
  "castingTime": "Bonus Action",
  "range": "Self",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "augury": {
  "sourcePage": 244,
  "castingTime": "1 minute or Ritual",
  "range": "Self",
  "components": "V, S, M (objetos de adivinación de 25+ po)",
  "duration": "Instantaneous"
 },
 "blindness_deafness": {
  "sourcePage": 248,
  "castingTime": "Action",
  "range": "120 feet",
  "components": "V",
  "duration": "1 minute"
 },
 "blur": {
  "sourcePage": 248,
  "castingTime": "Action",
  "range": "Self",
  "components": "V",
  "duration": "Concentration , up to 1 minute"
 },
 "cloud_of_daggers": {
  "sourcePage": 251,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S, M (a sliver of glass)",
  "duration": "Concentration, up to 1 minute"
 },
 "continual_flame": {
  "sourcePage": 256,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S, M (polvo de rubí de 50+ po; se consume)",
  "duration": "Until dispelled"
 },
 "crown_of_madness": {
  "sourcePage": 259,
  "castingTime": "Action",
  "range": "120 feet",
  "components": "V, S",
  "duration": "Concentration, up to 1 minute"
 },
 "darkness": {
  "sourcePage": 260,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, M (bat fur and a piece of coal)",
  "duration": "Concentration, up to 10 minutes"
 },
 "darkvision": {
  "sourcePage": 260,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S, M (a dried carrot)",
  "duration": "8 hours"
 },
 "detect_thoughts": {
  "sourcePage": 262,
  "castingTime": "Action",
  "range": "Self",
  "components": "V, S, M (1 Copper Piece)",
  "duration": "Concentration, up to 1 minute"
 },
 "dragons_breath": {
  "sourcePage": 266,
  "castingTime": "Bonus Action",
  "range": "Touch",
  "components": "V, S, M (a hot pepper)",
  "duration": "Concentration, up to 1 minute"
 },
 "enhance_ability": {
  "sourcePage": 268,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S, M (fur or a feather)",
  "duration": "Concentration, up to 1 hour"
 },
 "enlarge_reduce": {
  "sourcePage": 268,
  "castingTime": "Action",
  "range": "30 feet",
  "components": "V, S, M (a pinch of powdered iron)",
  "duration": "Concentration, up to 1 minute"
 },
 "flaming_sphere": {
  "sourcePage": 275,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S, M (a ball of wax)",
  "duration": "Concentration, up to 1 minute"
 },
 "gentle_repose": {
  "sourcePage": 278,
  "castingTime": "Action or Ritual",
  "range": "Touch",
  "components": "V, S, M (2 monedas de cobre; se consumen)",
  "duration": "10 days"
 },
 "gust_of_wind": {
  "sourcePage": 282,
  "castingTime": "Action",
  "range": "Self",
  "components": "V, S, M (a legume seed)",
  "duration": "Concentration, up to 1 minute"
 },
 "hold_person": {
  "sourcePage": 286,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S, M (a straight piece of iron)",
  "duration": "Concentration, up to 1 minute"
 },
 "invisibility": {
  "sourcePage": 289,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S, M (an eyelash in gum arabic)",
  "duration": "Concentration, up to 1 hour"
 },
 "knock": {
  "sourcePage": 290,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V",
  "duration": "Instantaneous"
 },
 "levitate": {
  "sourcePage": 291,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S, M (a metal spring)",
  "duration": "Concentration, up to 10 minutes"
 },
 "locate_object": {
  "sourcePage": 293,
  "castingTime": "Action",
  "range": "Self",
  "components": "V, S, M (a forked twig)",
  "duration": "Concentration, up to 10 minutes"
 },
 "magic_mouth": {
  "sourcePage": 295,
  "castingTime": "1 minute or Ritual",
  "range": "30 feet",
  "components": "V, S, M (polvo de jade de 10+ po; se consume)",
  "duration": "Until dispelled"
 },
 "magic_weapon": {
  "sourcePage": 295,
  "castingTime": "Bonus Action",
  "range": "Touch",
  "components": "V, S",
  "duration": "1 hour"
 },
 "melfs_acid_arrow": {
  "sourcePage": 297,
  "castingTime": "Action",
  "range": "90 feet",
  "components": "V, S, M (powdered rhubarb leaf)",
  "duration": "Instantaneous"
 },
 "mind_spike": {
  "sourcePage": 298,
  "castingTime": "Action",
  "range": "120 feet",
  "components": "S",
  "duration": "Concentration, up to 1 hour"
 },
 "mirror_image": {
  "sourcePage": 299,
  "castingTime": "Action",
  "range": "Self",
  "components": "\\/, S"
 },
 "misty_step": {
  "sourcePage": 299,
  "castingTime": "Bonus Action",
  "range": "Self",
  "components": "V",
  "duration": "Instantaneous"
 },
 "nystuls_magic_aura": {
  "sourcePage": 302,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S, M (a small square of silk)",
  "duration": "24 hours"
 },
 "phantasmal_force": {
  "sourcePage": 304,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S, M (a bit of fleece)",
  "duration": "Concentration, up to 1 minute"
 },
 "ray_of_enfeeblement": {
  "sourcePage": 311,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S",
  "duration": "Concentration, up to 1 minute"
 },
 "rope_trick": {
  "sourcePage": 312,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S, M (a segment of rope)",
  "duration": "1 hour"
 },
 "scorching_ray": {
  "sourcePage": 313,
  "castingTime": "Action",
  "range": "120 feet",
  "components": "V, S",
  "duration": "Instantaneous"
 },
 "see_invisibility": {
  "sourcePage": 314,
  "castingTime": "Action",
  "range": "Self",
  "components": "V, S, M (a pinch of talc)",
  "duration": "1 hour"
 },
 "shatter": {
  "sourcePage": 316,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S, M (a chip of mica)",
  "duration": "Instantaneous"
 },
 "spider_climb": {
  "sourcePage": 319,
  "castingTime": "Action",
  "range": "Touch",
  "components": "V, S, M (a drop of bitumen and a spider)",
  "duration": "Concentration, up to 1 hour"
 },
 "suggestion": {
  "sourcePage": 321,
  "castingTime": "Action",
  "range": "30 feet",
  "components": "V, M (a drop of honey)",
  "duration": "Concentration, up to 8 hours"
 },
 "web": {
  "sourcePage": 340,
  "castingTime": "Action",
  "range": "60 feet",
  "components": "V, S, M (a bit of spiderweb)",
  "duration": "Concentration, up to 1 hour"
 }
};
const EXTENDED_WIZARD_SPELLS=[...WIZARD_LEVEL_THREE_SPELLS,...WIZARD_LEVEL_FOUR_SPELLS,...WIZARD_LEVEL_FIVE_SPELLS,...WIZARD_LEVEL_SIX_SPELLS];
const extendedWizardSpell=(id:string)=>EXTENDED_WIZARD_SPELLS.find(detail=>detail.id===id);
export const WIZARD_SPELL_RULES:readonly WizardSpellRule[]=([ ...WIZARD_LEVEL_ONE_CANTRIPS,...WIZARD_SPELL_CATALOG ] as readonly {id:string;name:string;level:number;school:string;ritual?:boolean}[]).map(spell=>({ ...spell,description:extendedWizardSpell(spell.id)?.description??descriptions[spell.id],...source[spell.id],...extendedWizardSpell(spell.id),attack:extendedWizardSpell(spell.id)?.attack??attacks.has(spell.id),rolls:extendedWizardSpell(spell.id)?.rolls??dice[spell.id]??[],cantripScales:scaling.has(spell.id)}));
const rules=new Map(WIZARD_SPELL_RULES.map(spell=>[spell.id,spell]));
export function wizardSpellRule(id:string):WizardSpellRule|undefined{return rules.get(id);}
/** El dano de trucos basados en dados escala en 5/11/17; algunas excepciones no se automatizan. */
export function spellDiceForCharacter(formula:string,cantripScales:boolean,characterLevel:number):string{if(!cantripScales||characterLevel<5)return formula;const factor=characterLevel>=17?4:characterLevel>=11?3:2;return formula.replace(/^(\d+)d/,(_,n:string)=>String(Number(n)*factor)+'d');}
