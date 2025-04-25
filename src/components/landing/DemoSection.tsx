import MoleculeViewer from "@/components/molecule/MoleculeViewer";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const DemoSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            See BioStruct in Action
          </h2>
          <p className="max-w-[600px] text-muted-foreground text-lg">
            Experience the power of our intuitive visualization and analysis tools.
          </p>
        </div>
        
        <Tabs defaultValue="viewer" className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="viewer">Molecular Viewer</TabsTrigger>
              <TabsTrigger value="prediction">Structure Prediction</TabsTrigger>
              <TabsTrigger value="docking">Molecular Docking</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="viewer">
            <Card className="border shadow-lg overflow-hidden">
              <div className="h-[500px]">
                <MoleculeViewer />
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="prediction">
            <Card className="border shadow-lg overflow-hidden p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Protein Structure Prediction</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your protein sequence and get an accurate 3D structure prediction 
                    powered by state-of-the-art deep learning models.
                  </p>
                  
                  <div className="space-y-4 mt-6">
                    <h4 className="font-medium">Sample sequence (Antimicrobial peptide):</h4>
                    <div className="border rounded-md p-3 bg-muted/30 font-mono text-sm overflow-auto whitespace-pre-wrap">
                      &gt;Sample_Peptide
                      KLCERIRGYKCPNRGYCT
                    </div>
                    
                    <div className="space-y-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-biostruct-500 h-2 rounded-full w-full"></div>
                      </div>
                      <div className="text-sm text-muted-foreground">Structure predicted successfully!</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-black/5 rounded-lg overflow-hidden">
                  <MoleculeViewer initialPdbId="1ZFU" />
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="docking">
            <Card className="border shadow-lg overflow-hidden p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Molecular Docking</h3>
                  <p className="text-muted-foreground mb-4">
                    Screen compounds against your protein target to identify potential binding candidates.
                  </p>
                  
                  <div className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Sample Complex</h4>
                        <div className="border rounded-md p-3 bg-muted/30 text-sm">
                          <p>PDB ID: 1HVR</p>
                          <p>HIV-1 Protease</p>
                          <p>with Indinavir</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Binding Score</h4>
                        <div className="border rounded-md p-3 bg-muted/30 text-sm">
                          <p>Affinity: -12.4 kcal/mol</p>
                          <p>Ki: 0.9 nM</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-black/5 rounded-lg overflow-hidden">
                  <MoleculeViewer 
                    initialPdbId="1HVR"
                    initialStyle="licorice"
                    initialColor="chainname"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default DemoSection;
