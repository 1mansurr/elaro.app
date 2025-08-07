// utils/getAvatarText.ts

interface User {
  name?: string;
}

export const getAvatarText = (user?: User): string => {
  try {
    if (!user?.name) return 'U';

    // Clean the name and get initials safely
    const cleanName = user.name.trim().replace(/\s+/g, ' '); // Remove extra spaces
    const nameParts = cleanName.split(' ').filter(part => part.length > 0);

    if (nameParts.length === 0) return 'U';
    if (nameParts.length === 1) return nameParts[0][0]?.toUpperCase() || 'U';

    // Get first letter of first and last name
    const firstInitial = nameParts[0][0]?.toUpperCase() || '';
    const lastInitial = nameParts[nameParts.length - 1][0]?.toUpperCase() || '';

    return `${firstInitial}${lastInitial}`.substring(0, 2);
  } catch (error) {
    console.warn('Error generating avatar text:', error);
    return 'U';
  }
};
