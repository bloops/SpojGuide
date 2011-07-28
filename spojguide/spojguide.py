import cgi
import datetime
import urllib2
import wsgiref.handlers

from google.appengine.ext import db
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.api import urlfetch
from google.appengine.ext.webapp.util import run_wsgi_app

class ProblemInfo(db.Model):
  code = db.StringProperty()
  users = db.IntegerProperty()

class MainPage(webapp.RequestHandler):
  def get(self):
    self.response.out.write('Hello, World!')

class FetchProblem(webapp.RequestHandler):
  def get(self):
    self.response.headers['Content-Type'] = 'text/plain'

    problems = self.request.get('problem')
    problems = problems.split(",")
    for problem in problems:
      self.fetchProblemFromDb(problem)

  def fetchProblemFromDb(self,probcode):
    if(not probcode):
      self.response.out.write("-2\n")
      return
    p = db.get(db.Key.from_path('ProblemInfo',probcode))

    #self.response.out.write("Problem: " + p.code + " Users: " + str(p.users)+ "\n")      
    if(p):
      self.response.out.write(probcode + " " + str(p.users) + "\n")
    else:
      self.response.out.write("-1\n")


  def getProblem(self,probid):
    url = "http://www.spoj.pl/ranks/" + probid
    result = urllib2.urlopen(url)

    while(True):
      l = result.readline()
      if( l == '<tr class="lightrow">\n'):
        l = result.readline()
        l = l[4:-6];
        return l


class BuildDatabase(webapp.RequestHandler):

  def parseProblem(self, problemLines):
    code = problemLines[4][:-10]
    ac = problemLines[5][:-10]
    ac = ac[ac.rfind('>') + 1:]
    users = int(ac);
    self.response.out.write(code + " " + str(users) + "\n")

    try:
      prob = ProblemInfo(key_name=code)
      prob.code = code
      prob.users = users
      self.updated.append(prob)
    except:
      self.response.out.write("Database Error\n")
      

  def getPage(self,start):
    url = "http://www.spoj.pl/problems/classical/sort=0,start=" + str(start)
    result = urllib2.urlopen(url)
    self.response.headers['Content-Type'] = 'text/plain'
    lines = result.readlines()

    readingProblem = False
    problemLines = []

    self.updated = []
    for l in lines:
      if('problemrow' in l):
        readingProblem = True
        continue
      elif (readingProblem and '</tr>' in l):
        self.parseProblem(problemLines)
        problemLines = []
        readingProblem = False

      if(readingProblem):
        problemLines.append(l)

    db.put(self.updated)
    self.updated = []
    

  def get(self):
    start = int(self.request.get('start'))
    stop = int(self.request.get('stop'))
    for i in range(start,stop+1,50):
      self.getPage(i)
    #self.fakeParseProblem()
      


application = webapp.WSGIApplication([
    ('/', MainPage),
    ('/fetch',FetchProblem),  
    ('/build',BuildDatabase)
], debug=True)


def main():
  run_wsgi_app(application)


if __name__ == '__main__':
  main()
