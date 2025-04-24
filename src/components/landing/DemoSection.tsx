
import { MoleculeViewer } from "@/components/molecule/MoleculeViewer";
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
                    <h4 className="font-medium">Input your sequence:</h4>
                    <div className="border rounded-md p-3 bg-muted/30 font-mono text-sm overflow-auto">
                      &gt;Sample_Protein<br/>
                      MTKRSGPRELSEEIFSRLRKIAVKPDTIEVVDQTNDLTSQRGVLIVPHDVTI<br/>
                      DGGTFIKVAPNILDVINLVEEQGFTFRGDNGEPVERHIMKHGMTFQPIWVFS<br/>
                      PVTLKEAGELIPTLPLKINSVDLKDGTFQINHVNRYLNRGISTKEIVPGTTY<br/>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-biostruct-500 h-2 rounded-full w-3/4"></div>
                      </div>
                      <div className="text-sm text-muted-foreground">Processing: 75% complete...</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-black/5 rounded-lg flex items-center justify-center p-4">
                  <div className="text-center">
                    <div className="inline-block p-4 rounded-full bg-muted mb-4">
                      <svg className="w-16 h-16 text-biostruct-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium">Prediction in Progress</h4>
                    <p className="text-muted-foreground mt-2">
                      Our AI models are working to predict your protein structure.
                      Results will appear here when complete.
                    </p>
                  </div>
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
                        <h4 className="font-medium mb-2">Protein Target</h4>
                        <div className="border rounded-md p-3 bg-muted/30 text-sm">
                          PDB ID: 1XYZ<br />
                          Chains: A, B<br />
                          Resolution: 1.8Å
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Ligand Library</h4>
                        <div className="border rounded-md p-3 bg-muted/30 text-sm">
                          5 compounds<br />
                          Format: SDF<br />
                          Size: 2.3 MB
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Results</h4>
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2 text-left">Compound</th>
                              <th className="p-2 text-left">Score</th>
                              <th className="p-2 text-left">RMSD</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t">
                              <td className="p-2">Compound_1</td>
                              <td className="p-2">-8.3</td>
                              <td className="p-2">1.2</td>
                            </tr>
                            <tr className="border-t bg-muted/30">
                              <td className="p-2">Compound_2</td>
                              <td className="p-2">-7.9</td>
                              <td className="p-2">1.5</td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-2">Compound_3</td>
                              <td className="p-2">-6.8</td>
                              <td className="p-2">2.1</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-black/5 rounded-lg flex items-center justify-center p-4">
                  <div className="w-full h-full flex items-center justify-center">
                    <img 
                      src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=500&auto=format&fit=crop" 
                      alt="Molecular docking visualization" 
                      className="max-w-full max-h-full rounded-md"
                    />
                  </div>
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
