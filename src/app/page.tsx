
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import PdfViewer from "@/components/pdf-viewer";
import DataEditor from "@/components/data-editor";
import { extractDataFromPdf, type ExtractDataFromPdfOutput } from "@/ai/flows/extract-data-from-pdf";
import { saveToGoogleSheet, type SaveToGoogleSheetOutput } from "@/ai/flows/save-to-google-sheet";
import type { ExtractedPdfData } from "@/ai/schemas/pdf-data-schema";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Cpu, FileJson, Loader2, AlertTriangle, Database, Sheet as SheetIcon } from 'lucide-react';

export default function PdfExtractorPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  
  const [extractedData, setExtractedData] = useState<ExtractedPdfData | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSavingToMongoDb, setIsSavingToMongoDb] = useState<boolean>(false);
  const [isSavingToSheet, setIsSavingToSheet] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) {
        URL.revokeObjectURL(pdfObjectUrl);
      }
    };
  }, [pdfObjectUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setError(null);
      setExtractedData(null); 

      if (pdfObjectUrl) {
        URL.revokeObjectURL(pdfObjectUrl);
      }
      const newObjectUrl = URL.createObjectURL(file);
      setPdfObjectUrl(newObjectUrl);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPdfDataUri(reader.result as string);
      };
      reader.readAsDataURL(file);
      
    } else {
      setPdfFile(null);
      setPdfObjectUrl(null);
      setPdfDataUri(null);
      setError("Please select a valid PDF file.");
      toast({
        title: "Invalid File",
        description: "Please select a valid PDF file.",
        variant: "destructive",
      });
    }
  };

  const handleProcessPdf = async () => {
    if (!pdfDataUri) {
      setError("Please select a PDF file first.");
      toast({
        title: "No PDF Selected",
        description: "Please select a PDF file to process.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedData(null); 

    try {
      const result: ExtractDataFromPdfOutput = await extractDataFromPdf({ pdfDataUri });

      if (result && result.error) {
        console.error("Error from AI flow:", result.error, "Full result object:", result);
        const displayError = `AI Flow Error: ${result.error}`;
        setError(displayError);
        setExtractedData(null); 
        toast({
          title: "Extraction Failed",
          description: displayError,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      if (result && result.jsonOutput && result.jsonOutput.trim() !== '' && result.jsonOutput.trim() !== '{}') {
        try {
          const parsedData: ExtractedPdfData = JSON.parse(result.jsonOutput);
          setExtractedData(parsedData);
          toast({
            title: "Data Extracted",
            description: "PDF data has been successfully extracted.",
          });
        } catch (parseError: any) {
          console.error("Error parsing AI output as JSON:", parseError, "Raw output:", result.jsonOutput);
          const displayError = "Failed to parse AI output. The AI returned an unexpected format.";
          setError(displayError);
          setExtractedData(null); 
          toast({
            title: "Parsing Failed",
            description: displayError,
            variant: "destructive",
          });
        }
      } else {
        let errorMessage = "AI did not return expected data format or returned empty/default data.";
        if (!result) {
            errorMessage = "No response from AI service.";
        } else if (!result.jsonOutput) {
            errorMessage = "AI response missing 'jsonOutput' field.";
        } else if (result.jsonOutput.trim() === '' || result.jsonOutput.trim() === '{}') {
            errorMessage = "AI returned empty/default data. Review PDF content or prompt if fields are unexpectedly empty.";
        }
        console.warn("Problematic AI Result:", errorMessage, "Full result object:", result);
        setError(errorMessage);
        try {
          const parsedData: ExtractedPdfData = result && result.jsonOutput ? JSON.parse(result.jsonOutput) : null;
          setExtractedData(parsedData); 
           if (parsedData) {
            toast({
              title: "Extraction Note",
              description: "AI processed the PDF but returned default/empty values for some or all fields. Data is shown for review.",
              variant: "default" 
            });
          }
        } catch (e) {
          console.error("Error parsing even default AI output:", e, "Raw output:", result?.jsonOutput);
          setExtractedData(null); 
        }
      }
    } catch (err: any) { 
      console.error("Error processing PDF in client:", err);
      const errorMessage = err.message || "An unknown error occurred during PDF processing.";
      setError(errorMessage);
      setExtractedData(null); 
      toast({
        title: "Processing Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataChange = (updatedData: ExtractedPdfData) => {
    setExtractedData(updatedData);
  };

  const handleDownloadJson = () => {
    if (!extractedData) {
      toast({
        title: "No Data",
        description: "There is no data to download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const jsonString = JSON.stringify(extractedData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pdfFile?.name.replace(/\.pdf$/i, '') || 'extracted_data'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Download Started",
        description: "Your JSON file is downloading.",
      });
    } catch (e: any) {
        console.error("Error preparing JSON for download:", e);
        toast({
            title: "Download Error",
            description: "Could not prepare data for download. Ensure data is valid JSON.",
            variant: "destructive",
        });
    }
  };

  const handleSaveToMongoDb = async () => {
    if (!extractedData) {
      toast({
        title: "No Data",
        description: "There is no extracted data to save.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingToMongoDb(true);
    try {
      const response = await fetch('/api/save-to-mongodb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(extractedData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Saved to MongoDB",
          description: `${result.message} (ID: ${result.recordId || 'N/A'})`,
        });
      } else {
        toast({
          title: "MongoDB Save Failed",
          description: result.message || "An unknown error occurred while saving via API.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error saving to MongoDB via API:", err);
      toast({
        title: "MongoDB Save Error",
        description: err.message || "An unknown network or client-side error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSavingToMongoDb(false);
    }
  };

  const handleSaveToSheet = async () => {
    if (!extractedData) {
      toast({
        title: "No Data",
        description: "There is no extracted data to save to Google Sheet.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingToSheet(true);
    try {
      const result: SaveToGoogleSheetOutput = await saveToGoogleSheet(extractedData);
      if (result.success) {
        toast({
          title: "Saved to Google Sheet",
          description: result.message,
        });
      } else {
        toast({
          title: "Google Sheet Save Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error saving to Google Sheet via Genkit flow:", err);
      toast({
        title: "Google Sheet Save Error",
        description: err.message || "An unknown error occurred during the Genkit flow.",
        variant: "destructive",
      });
    } finally {
      setIsSavingToSheet(false);
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-background p-4 md:p-8 selection:bg-primary/20">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-center text-primary tracking-tight">
          PDF Data Extractor
        </h1>
        <p className="text-center text-muted-foreground mt-2 text-lg">
          Upload a PDF, extract data using AI, and edit it seamlessly.
        </p>
      </header>

      <div className="mb-8 p-6 bg-card rounded-xl shadow-xl border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            <Label htmlFor="pdf-upload" className="text-lg font-medium mb-2 block text-foreground">
              Upload PDF Document
            </Label>
            <div className="flex items-center space-x-3">
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                aria-label="Upload PDF Document"
              />
              <Button
                onClick={handleProcessPdf}
                disabled={isLoading || !pdfFile || isSavingToMongoDb || isSavingToSheet}
                className="bg-accent hover:bg-accent/90 text-accent-foreground min-w-[150px] transition-all duration-150 ease-in-out transform active:scale-95"
                aria-label="Process PDF for data extraction"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Cpu className="mr-2 h-5 w-5" />
                )}
                {isLoading ? "Processing..." : "Process PDF"}
              </Button>
            </div>
             {pdfFile && (
              <p className="mt-3 text-sm text-muted-foreground">
                Selected file: <span className="font-medium text-foreground">{pdfFile.name}</span>
              </p>
            )}
          </div>
          {extractedData && (
             <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mt-4 md:mt-0">
                <Button
                    onClick={handleDownloadJson}
                    disabled={!extractedData || isLoading || isSavingToMongoDb || isSavingToSheet}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/5 hover:text-primary min-w-[150px] transition-all duration-150 ease-in-out"
                    aria-label="Download extracted data as JSON"
                >
                    <FileJson className="mr-2 h-5 w-5" />
                    Download JSON
                </Button>
                <Button
                    onClick={handleSaveToMongoDb}
                    disabled={!extractedData || isLoading || isSavingToMongoDb || isSavingToSheet}
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-500/10 hover:text-green-700 min-w-[150px] transition-all duration-150 ease-in-out"
                    aria-label="Save extracted data to MongoDB"
                >
                    {isSavingToMongoDb ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <Database className="mr-2 h-5 w-5" />
                    )}
                    {isSavingToMongoDb ? "Saving..." : "Save to DB"}
                </Button>
                <Button
                    onClick={handleSaveToSheet}
                    disabled={!extractedData || isLoading || isSavingToMongoDb || isSavingToSheet}
                    variant="outline"
                    className="border-blue-500 text-blue-500 hover:bg-blue-500/10 hover:text-blue-600 min-w-[150px] transition-all duration-150 ease-in-out"
                    aria-label="Save extracted data to Google Sheet"
                >
                    {isSavingToSheet ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <SheetIcon className="mr-2 h-5 w-5" />
                    )}
                    {isSavingToSheet ? "Saving..." : "Save to Sheet"}
                </Button>
            </div>
          )}
        </div>
        {error && (
          <Alert variant="destructive" className="mt-6 shadow-md">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <section className="h-[calc(100vh-280px)] min-h-[500px] rounded-xl overflow-hidden border border-border">
          <PdfViewer pdfUrl={pdfObjectUrl} />
        </section>
        <section className="h-[calc(100vh-280px)] min-h-[500px] rounded-xl overflow-hidden border border-border">
          <DataEditor data={extractedData} onDataChange={handleDataChange} />
        </section>
      </main>
    </div>
  );
}
