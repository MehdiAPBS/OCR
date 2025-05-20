
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import PdfViewer from "@/components/pdf-viewer";
import DataEditor from "@/components/data-editor";
import { extractDataFromPdf, type ExtractDataFromPdfOutput } from "@/ai/flows/extract-data-from-pdf";
import type { ExtractedPdfData } from "@/ai/schemas/pdf-data-schema";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Cpu, FileJson, Loader2, AlertTriangle } from 'lucide-react';

export default function PdfExtractorPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  
  const [extractedData, setExtractedData] = useState<ExtractedPdfData | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Clean up object URL when component unmounts or pdfFile changes
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
      setExtractedData(null); // Reset extracted data

      // Create Object URL for PDF Viewer
      if (pdfObjectUrl) {
        URL.revokeObjectURL(pdfObjectUrl);
      }
      const newObjectUrl = URL.createObjectURL(file);
      setPdfObjectUrl(newObjectUrl);

      // Create Data URI for AI processing
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
    setExtractedData(null); // Reset on new processing attempt

    try {
      const result: ExtractDataFromPdfOutput = await extractDataFromPdf({ pdfDataUri });

      if (result && result.error) {
        console.error("Error from AI flow:", result.error, "Full result object:", result);
        const displayError = result.error;
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
        let errorMessage = "AI did not return expected data format or returned empty data.";
        if (!result) {
            errorMessage = "No response from AI service.";
        } else if (!result.jsonOutput) {
            errorMessage = "AI response missing 'jsonOutput' field.";
        } else if (result.jsonOutput.trim() === '' || result.jsonOutput.trim() === '{}') {
            errorMessage = "AI returned empty data. Please check the PDF content or try again.";
        }
        console.error("Problematic AI Result:", errorMessage, "Full result object:", result);
        setError(errorMessage);
        setExtractedData(null);
        toast({
          title: "Extraction Incomplete",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (err: any) { // This catch is for errors *calling* the flow, or other unexpected client-side errors
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
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
                disabled={isLoading || !pdfFile}
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
             <div className="md:text-right">
                <Button
                    onClick={handleDownloadJson}
                    disabled={!extractedData}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/5 hover:text-primary min-w-[150px] transition-all duration-150 ease-in-out"
                    aria-label="Download extracted data as JSON"
                >
                    <FileJson className="mr-2 h-5 w-5" />
                    Download JSON
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

