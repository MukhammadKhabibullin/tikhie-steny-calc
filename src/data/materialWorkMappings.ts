import type { MaterialItem } from '../types';

export const WORK_CATALOG_IDS = {
  genericProfile: '64212546-0c36-548c-8360-22830b4cab33',
  membrane: '90552328-69cc-5d55-bead-5d61abea58ba',
  felt: '7fc9bed5-3dad-54e7-a18f-8f446eee810c',
  fabric: '35b43c18-5dbf-517c-a632-d57a54b739cb',
  angle: '94cc8cf1-4e9a-556e-b9e9-fe4563d8b5ad',
  shadowDivider: '573ca87d-77d4-5a22-818b-26e0ba8882d1',
  lightLine: 'a4a543bb-6379-5a7a-b98b-a8c351a339bc',
  diffuser: '98500289-1bec-5130-ad48-c0ccb4b139f0',
  cascade: '70ba1fc1-05e8-5b2e-a688-f305e3055c67',
  cascadeConstructorOrSlope: 'c4d51f43-5d0f-5e80-98bf-319460b8bbad',
  socketBacking: 'f29ff971-992d-5f79-a66d-3e96510a4b4c',
  equipmentBacking: 'a41ed9d3-941d-5477-a59b-015d00181625',
  plinthBacking: 'c9f5c67f-b51d-59b8-85ab-44ff5b056be8',
  plywood: '63675adf-5d14-5172-aec9-8b45e7dfb02f',
  nonstandardGeometry: '129cd4b1-d2c4-56c5-94fd-9c5a66e03d89',
  wallLightBacking: '2cf6d169-ee0b-531d-b728-50f712ba13be',
  ledTape: '79d444fc-89b1-5911-a5a2-801fc0345a7e',
  powerSupply: '0fb607b6-c234-5c50-9227-abe1ca34ed78',
} as const;

const MATERIAL_WORK_BY_CATALOG_ID: Record<string, string> = {
  '5eba4106-4f8d-5a9f-a5b3-a1359dedb952': WORK_CATALOG_IDS.membrane,
  'a3427e66-c09e-5ea8-818e-2736fe73914b': WORK_CATALOG_IDS.felt,
  'f67b105d-5726-5787-9632-b4c15f9efa8e': WORK_CATALOG_IDS.angle,
  '49aac7de-6ab1-516e-9a49-f588a98a065b': WORK_CATALOG_IDS.cascadeConstructorOrSlope,
  '4db71636-4b48-5e8b-82f0-48a00b5baff3': WORK_CATALOG_IDS.cascadeConstructorOrSlope,
  'afedcd98-1062-5ea1-a573-d7f851bb86b1': WORK_CATALOG_IDS.shadowDivider,
  '84284564-6f59-5a99-baa3-b4743386036e': WORK_CATALOG_IDS.cascade,
  '554b32ea-a65b-55eb-bfeb-759119cca4ef': WORK_CATALOG_IDS.cascadeConstructorOrSlope,
  '51c1c094-9fdb-539e-87f5-2e38f5705aa2': WORK_CATALOG_IDS.lightLine,
  '22d29c9d-72da-51dc-a673-7678655d5876': WORK_CATALOG_IDS.diffuser,
  'a07e5ad3-5adb-53fb-8acb-7c30497951f5': WORK_CATALOG_IDS.socketBacking,
  '17b6b27b-a6b2-592d-b48a-017682fe8399': WORK_CATALOG_IDS.socketBacking,
  'be8b215f-759f-550d-8a98-c516b4e51322': WORK_CATALOG_IDS.socketBacking,
  'a22bda8c-b64d-5dc8-84f0-ec6c56d81b97': WORK_CATALOG_IDS.socketBacking,
  'ce5b1d7e-f9f2-5ed4-87b0-5d0ae34f67f4': WORK_CATALOG_IDS.socketBacking,
  'e9ba46c7-e33e-56a9-a732-b17ac6bca9df': WORK_CATALOG_IDS.wallLightBacking,
  '8075c276-cc71-5772-975b-b8efc528d6e5': WORK_CATALOG_IDS.equipmentBacking,
  '79e15139-c022-5e8b-881b-5aaf6efb2436': WORK_CATALOG_IDS.plinthBacking,
  'd766f18d-8c6f-513a-9d62-cbeae7d0c5a9': WORK_CATALOG_IDS.nonstandardGeometry,
  'a3a6c724-ed94-5955-b8ac-1e24915d4ef3': WORK_CATALOG_IDS.plywood,
  'f382a15e-23fc-52d2-8f51-e43ee5fa1063': WORK_CATALOG_IDS.ledTape,
  '1a7dd2da-1f25-55aa-be15-4449973ebbe9': WORK_CATALOG_IDS.powerSupply,
};

const normalizeName = (name: string): string => name.trim().toLocaleLowerCase('ru-RU');

/**
 * Returns the price-list work associated with a material line.
 * Stable catalog ids are preferred; name rules keep custom/legacy catalogs usable.
 */
export const getMaterialWorkCatalogId = (material: MaterialItem): string | undefined => {
  if (material.catalogId && MATERIAL_WORK_BY_CATALOG_ID[material.catalogId]) {
    return MATERIAL_WORK_BY_CATALOG_ID[material.catalogId];
  }

  const name = normalizeName(material.name);
  if (material.category === 'fabric') return WORK_CATALOG_IDS.fabric;
  if (material.category === 'insulation') {
    if (name.includes('войлок')) return WORK_CATALOG_IDS.felt;
    if (name.includes('мембран')) return WORK_CATALOG_IDS.membrane;
    return undefined;
  }
  if (name.includes('внутр.угол') || name.includes('внутренний угол')) return WORK_CATALOG_IDS.angle;
  if (name.includes('окно-откос') || name.includes('конструктор 5см')) {
    return WORK_CATALOG_IDS.cascadeConstructorOrSlope;
  }
  if (name.includes('каскад')) return WORK_CATALOG_IDS.cascade;
  if (name.includes('теневой') && name.includes('разделитель')) return WORK_CATALOG_IDS.shadowDivider;
  if (name.includes('световая линия')) return WORK_CATALOG_IDS.lightLine;
  if (name.includes('рассеиватель')) return WORK_CATALOG_IDS.diffuser;
  if (name.includes('рондо') && name.includes('розет')) return WORK_CATALOG_IDS.socketBacking;
  if (name.includes('закладная под настенный светильник')) return WORK_CATALOG_IDS.wallLightBacking;
  if (name.includes('закладная для навесной техники')) return WORK_CATALOG_IDS.equipmentBacking;
  if (name.includes('закладная под плинтус')) return WORK_CATALOG_IDS.plinthBacking;
  if (name.includes('фанера')) return WORK_CATALOG_IDS.plywood;
  if (name.includes('нестандартная закладная')) return WORK_CATALOG_IDS.nonstandardGeometry;
  if (name.includes('лента светодиодная')) return WORK_CATALOG_IDS.ledTape;
  if (name.includes('блок питания')) return WORK_CATALOG_IDS.powerSupply;

  if (['profile', 'plinth', 'divider', 'bumper'].includes(material.category)) {
    return WORK_CATALOG_IDS.genericProfile;
  }
  return undefined;
};
