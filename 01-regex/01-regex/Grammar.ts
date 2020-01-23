export class Grammar {
    
    
    constructor(Gram: string)
    {
        let s: Set<string> = new Set();
        let input = Gram.split("\n");
        
        for (let i = 0; i < input.length; i++)
        {
            if(input[i]!='')
            {
                if (!input[i].includes(" -> "))
                    throw new Error("No Identifiers");
                let ID = input[i].split(" -> ");
                if (s.has(ID[0]))
                    throw new Error("Already has that variable");
                s.add(ID[0]);
                try {
                    new RegExp(ID[1])
                }
                catch(e)
                {
                    throw new Error("Invalid regular expression")
                }
            }
            
        }

       
    }
    

}