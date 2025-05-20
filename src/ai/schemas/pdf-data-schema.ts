
import { z } from 'zod';

// Schema for the actual structured data the AI should extract
export const ExtractedPdfDataSchema = z.object({
  classe: z.string().describe('The class name. Return "" if not found.'),
  cours: z.string().describe('The course name. Return "" if not found.'),
  date: z.string().describe('The date of the session. Return "" if not found.'),
  nom_du_professeur: z.string().describe("The professor's name. Return \"\" if not found."),
  nombre_des_présents: z.number().describe('The number of present students. Return 0 if not found.'),
  salle_n: z.string().describe('The room number. Return "" if not found.'),
  séance: z.string().describe('The session information. Return "" if not found.'),
  présences: z.array(z.object({
    n: z.string().describe('The student number or ID. Return "" if not found.'),
    nom_prénom: z.string().describe("The student's full name. Return \"\" if not found."),
  })).describe('An array representing the attendees. Return [] if not found or if data is missing for all attendees.'),
});
export type ExtractedPdfData = z.infer<typeof ExtractedPdfDataSchema>;
