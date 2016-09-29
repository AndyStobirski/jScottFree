using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;

namespace HintProcess
{
    class Program
    {
        static void Main(string[] args)
        {

            foreach (String f in Directory.GetFiles(Directory.GetCurrentDirectory()))
            {
                if (f.EndsWith(".txt"))
                    doStuff(f.Remove(0,Directory.GetCurrentDirectory().Length + 1 ));
            }


        }

        static void doStuff(string pFile)
        {
            if (File.Exists(pFile))
            {
                string entireFile = null;

                using (StreamReader sr = new StreamReader(pFile))
                    entireFile = sr.ReadToEnd();

                //locate the dictionary
                int loc = entireFile.IndexOf("* DICTIONARY *");

                if (loc > 0)
                {
                    //step forwards a line
                    while (entireFile[loc++] != '\n') { };

                    string[] keys = entireFile.Substring(loc).Split(new char[0], StringSplitOptions.RemoveEmptyEntries)
                        .Select(i => i.Trim()).ToArray();


                    Dictionary<string, string> lookup = new Dictionary<string, string>();
                    for (int i = 0; i < keys.Length / 2; i++)
                        lookup.Add(keys[i * 2], keys[i * 2 + 1]);


                    //step back two lines
                    while (entireFile[loc--] != '\n') { };
                    while (entireFile[loc--] != '\n') { };

                    //gotten to the point before the dictionary header
                    StringBuilder Output = new StringBuilder(entireFile);

                    StringBuilder sb = new StringBuilder();
                    int n;

                    while (loc >= 0)
                    {
                        //step backward for white spaces
                        while (String.IsNullOrWhiteSpace(entireFile[loc--].ToString())) { };
                        loc++;

                        //step backwards for non non-white spaces
                        while (loc >= 0 && !String.IsNullOrWhiteSpace(entireFile[loc].ToString()))
                        {
                            sb.Insert(0, entireFile[loc]);
                            loc--;
                        };

                        //see if what we've got is a number
                        if (int.TryParse(sb.ToString(), out n))
                        {
                            Console.WriteLine(n);

                            if (entireFile[loc] != '\n')    //not a first on a new line
                            {
                                Output.Remove(loc + 1, sb.ToString().Length);
                                Output.Insert(loc + 1, lookup[sb.ToString()]);
                            }

                        }

                        sb.Clear();
                    }

                    using (StreamWriter sw = new StreamWriter("TRANSLATED_" + pFile))
                        sw.Write(Output.ToString());
                }

            }
        }
    }
}
