"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PdfViewer from "@/components/pdf-viewer";
import DataEditor from "@/components/data-editor";
import { extractDataFromPdf, type ExtractDataFromPdfOutput } from "@/ai/flows/extract-data-from-pdf";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Cpu, FileJson, Loader2, AlertTriangle, FileText, Edit3 } from 'lucide-react';

export default function PdfExtractorPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  
  const [extractedData, setExtractedData] = useState<Record<string, any> | null>(null);
  
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

    try {
      const result: ExtractDataFromPdfOutput = await extractDataFromPdf({ pdfDataUri });
      if (result && result.extractedData) {
        setExtractedData(result.extractedData);
        toast({
          title: "Data Extracted",
          description: "PDF data has been successfully extracted.",
        });
      } else {
        throw new Error("AI did not return extracted data.");
      }
    } catch (err: any) {
      console.error("Error processing PDF:", err);
      const errorMessage = err.message || "An unknown error occurred during PDF processing.";
      setError(errorMessage);
      toast({
        title: "Extraction Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setExtractedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataChange = (updatedData: Record<string, any>) => {
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
      // Ensure that any stringified JSON within values is properly handled or validated if necessary
      // For now, we assume `extractedData` is the source of truth for download.
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
