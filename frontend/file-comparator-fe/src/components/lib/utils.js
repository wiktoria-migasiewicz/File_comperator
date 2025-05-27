// Łączy klasy Tailwinda w jednego stringa
export function cn(...inputs) {
  return inputs.filter(Boolean).join(" ");
}
