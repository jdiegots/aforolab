import { format } from "date-fns";
import { es } from "date-fns/locale";

export const formatDate = (date: Date, fmt: string = "dd MMM yyyy") => {
  return format(date, fmt, { locale: es });
};