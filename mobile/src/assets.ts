import type { ImageSourcePropType } from 'react-native';
import type { Item } from './types';

export const brandMark = require('../assets/roosevelt.jpg');
export const pantryFonts = {
  Manrope: require('../assets/fonts/Manrope-Regular.ttf'),
  ManropeSemiBold: require('../assets/fonts/Manrope-SemiBold.ttf'),
  ManropeBold: require('../assets/fonts/Manrope-Bold.ttf'),
};

// Editorial photographs from the supplied Stitch project. The API has no photo or package-size field.
const photos: Record<string, ImageSourcePropType> = {
  rice: require('../assets/pantry/rice.jpg'),
  'long grain white rice': require('../assets/pantry/rice.jpg'),
  pasta: require('../assets/pantry/pasta.jpg'),
  'fresh milk': require('../assets/pantry/milk.jpg'),
  toothpaste: require('../assets/pantry/toothpaste.jpg'),
  'canned beans': require('../assets/pantry/beans.jpg'),
  'canned black beans': require('../assets/pantry/beans.jpg'),
  'rolled oats': require('../assets/pantry/oats.jpg'),
};

export function productPhoto(item: Pick<Item, 'name' | 'category'>, large: boolean) {
  const name = item.name.toLowerCase().trim();
  if ((item.category === 'Hygiene') !== (name === 'toothpaste')) return undefined;
  if (large && (name === 'rice' || name === 'long grain white rice')) return require('../assets/pantry/rice-shelf.jpg');
  return photos[name];
}
